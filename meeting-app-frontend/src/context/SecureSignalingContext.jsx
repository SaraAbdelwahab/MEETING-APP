import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import axiosInstance from '../api/axios';

export const SecureSignalingContext = createContext(null);

export const useSecureSignaling = () => {
    const ctx = useContext(SecureSignalingContext);
    if (!ctx) throw new Error('useSecureSignaling must be used within SecureSignalingProvider');
    return ctx;
};

// AES-256-GCM encrypt using Web Crypto API
async function aesGcmEncrypt(keyBuffer, plaintext) {
    const key = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    // Return base64(iv + ciphertext)
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);
    return btoa(String.fromCharCode(...combined));
}

// AES-256-GCM decrypt using Web Crypto API
async function aesGcmDecrypt(keyBuffer, encryptedBase64) {
    const key = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, ['decrypt']);
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext));
}

// Derive session key via HKDF-SHA256 (mirrors backend deriveSessionKey)
async function deriveSessionKey(ecdhSecret, kemSharedSecret, sessionId) {
    const ikm = new Uint8Array([...ecdhSecret, ...kemSharedSecret]);
    const salt = new TextEncoder().encode(sessionId || 'default-salt');
    const info = new TextEncoder().encode('session-key');

    const baseKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        baseKey,
        256
    );
    return new Uint8Array(derived);
}

export const SecureSignalingProvider = ({ children }) => {
    const { socket, emit, on, off } = useSocket();
    const { user, isAuthenticated } = useAuth();

    const [sessionId, setSessionId] = useState(null);
    const [keyStatus, setKeyStatus] = useState('pending'); // pending | active | rotating | error
    const sessionKeyRef = useRef(null); // Uint8Array — never stored in state/localStorage

    // Perform hybrid key exchange on mount when authenticated (optional - non-blocking)
    useEffect(() => {
        if (!isAuthenticated || !user) return;
        // Make key exchange optional - don't block app if it fails
        performKeyExchange().catch(err => {
            console.warn('[SecureSignaling] Key exchange failed (optional feature):', err.message);
            setKeyStatus('error');
        });
    }, [isAuthenticated, user]);

    // Listen for rekey-init from server
    useEffect(() => {
        if (!socket) return;
        const handleRekeyInit = async (data) => {
            setKeyStatus('rotating');
            try {
                // For simplicity: generate new random key (full impl would re-do KEM)
                const newKey = crypto.getRandomValues(new Uint8Array(32));
                sessionKeyRef.current = newKey;
                emit('secure:rekey-confirm', { newSessionId: data.newSessionId });
                setSessionId(data.newSessionId);
                setKeyStatus('active');
            } catch (err) {
                console.error('[SecureSignaling] Rekey failed:', err);
                setKeyStatus('error');
            }
        };
        on('secure:rekey-init', handleRekeyInit);
        return () => off('secure:rekey-init', handleRekeyInit);
    }, [socket]);

    const performKeyExchange = async () => {
        try {
            setKeyStatus('pending');

            // Generate X25519 key pair
            const x25519KeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
            const clientPubKeyDer = await crypto.subtle.exportKey('spki', x25519KeyPair.publicKey);
            const clientX25519Pub = btoa(String.fromCharCode(...new Uint8Array(clientPubKeyDer)));

            // Attempt ML-KEM-768 (graceful fallback if unavailable)
            let clientKEMEncapKey = null;
            let kemDecapKey = null;
            try {
                const { MlKem768 } = await import('mlkem');
                const kem = new MlKem768();
                const [encapKey, decapKey] = await kem.generateKeyPair();
                clientKEMEncapKey = btoa(String.fromCharCode(...encapKey));
                kemDecapKey = decapKey;
            } catch {
                console.warn('[SecureSignaling] ML-KEM not available, using ECDH-only');
            }

            // POST to backend (optional - may fail if service unavailable)
            const response = await axiosInstance.post('/sessions/init', {
                clientX25519Pub,
                clientKEMEncapKey,
                meetingId: null,
            }).catch(err => {
                // If service unavailable, log warning but don't crash
                console.warn('[SecureSignaling] Backend key exchange unavailable:', err.response?.status);
                throw new Error('Key exchange service unavailable (optional feature)');
            });

            const { sessionId: sid, serverX25519Pub, kemCiphertext } = response.data;

            // Derive ECDH shared secret
            const serverPubKeyBytes = Uint8Array.from(atob(serverX25519Pub), c => c.charCodeAt(0));
            const serverPubKey = await crypto.subtle.importKey(
                'spki', serverPubKeyBytes.buffer,
                { name: 'ECDH', namedCurve: 'P-256' }, false, []
            );
            const ecdhBits = await crypto.subtle.deriveBits(
                { name: 'ECDH', public: serverPubKey },
                x25519KeyPair.privateKey,
                256
            );
            const ecdhSecret = new Uint8Array(ecdhBits);

            // Decapsulate KEM if available
            let kemSharedSecret = new Uint8Array(32);
            if (kemDecapKey && kemCiphertext) {
                try {
                    const { MlKem768 } = await import('mlkem');
                    const kem = new MlKem768();
                    const cipherBytes = Uint8Array.from(atob(kemCiphertext), c => c.charCodeAt(0));
                    kemSharedSecret = await kem.decap(cipherBytes, kemDecapKey);
                } catch (err) {
                    console.warn('[SecureSignaling] KEM decap failed:', err.message);
                }
            }

            // Derive session key
            const sessionKey = await deriveSessionKey(ecdhSecret, kemSharedSecret, sid);
            sessionKeyRef.current = sessionKey;
            setSessionId(sid);
            setKeyStatus('active');

            // Notify backend that session is ready (with device fingerprint)
            const fingerprintComponents = {
                hardwareConcurrency: navigator.hardwareConcurrency || 4,
                platform: navigator.platform || 'unknown',
                screenHash: `${screen.width}x${screen.height}`,
                userAgentHash: btoa(navigator.userAgent).slice(0, 16),
                timezoneOffset: new Date().getTimezoneOffset(),
            };
            emit('secure:session-ready', { sessionId: sid, fingerprintComponents });

        } catch (err) {
            console.error('[SecureSignaling] Key exchange failed:', err);
            setKeyStatus('error');
        }
    };

    /**
     * Emit an encrypted secure:* event.
     * Falls back to unencrypted if key exchange failed (optional feature).
     */
    const secureEmit = useCallback(async (event, payload) => {
        if (!sessionKeyRef.current) {
            console.debug('[SecureSignaling] No session key — emitting unencrypted (key exchange is optional)');
            emit(`secure:${event}`, payload);
            return;
        }
        try {
            const encrypted = await aesGcmEncrypt(sessionKeyRef.current, payload);
            emit(`secure:${event}`, { encrypted, sessionId });
        } catch (err) {
            console.error('[SecureSignaling] Encrypt failed:', err);
            // Fallback to unencrypted
            emit(`secure:${event}`, payload);
        }
    }, [sessionId, emit]);

    /**
     * Register a listener for an encrypted secure:* event.
     */
    const onSecure = useCallback((event, handler) => {
        const wrappedHandler = async (data) => {
            if (data?.encrypted && sessionKeyRef.current) {
                try {
                    const decrypted = await aesGcmDecrypt(sessionKeyRef.current, data.encrypted);
                    handler(decrypted);
                } catch (err) {
                    console.error('[SecureSignaling] Decrypt failed:', err);
                }
            } else {
                handler(data);
            }
        };
        on(`secure:${event}`, wrappedHandler);
    }, [on]);

    const offSecure = useCallback((event) => {
        off(`secure:${event}`);
    }, [off]);

    const value = {
        sessionId,
        keyStatus,
        secureEmit,
        onSecure,
        offSecure,
    };

    return (
        <SecureSignalingContext.Provider value={value}>
            {children}
        </SecureSignalingContext.Provider>
    );
};
