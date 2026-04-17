import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import axiosInstance from '../../api/axios';

const DB_NAME = 'biometric-store';
const DB_VERSION = 1;
const STORE_NAME = 'descriptors';
const KEY_STORE_NAME = 'device-keys';
const PRESENCE_INTERVAL_MS = 60000; // 60 seconds
const DESCRIPTOR_THRESHOLD = 0.6;

// Open IndexedDB
function openBiometricDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
            if (!db.objectStoreNames.contains(KEY_STORE_NAME)) db.createObjectStore(KEY_STORE_NAME);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet(db, storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbPut(db, storeName, key, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Euclidean distance between two Float32Arrays
function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}

// Create a minimal JWT signed with ECDSA P-256
async function createVerificationToken(payload, privateKey) {
    const header = { alg: 'ES256', typ: 'JWT' };
    const encodeB64 = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signingInput = `${encodeB64(header)}.${encodeB64(payload)}`;
    const encoded = new TextEncoder().encode(signingInput);
    const sigBuffer = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoded);
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${signingInput}.${sig}`;
}

const BiometricEngine = ({ localStream }) => {
    const { user } = useAuth();
    const { emit } = useSocket();

    const [enrollmentStatus, setEnrollmentStatus] = useState('idle'); // idle | enrolling | enrolled | error
    const [presenceStatus, setPresenceStatus] = useState('idle'); // idle | present | absent | checking | challenge
    const [errorMessage, setErrorMessage] = useState('');

    const faceapiRef = useRef(null);
    const dbRef = useRef(null);
    const privateKeyRef = useRef(null); // non-extractable CryptoKey
    const presenceIntervalRef = useRef(null);
    const deviceId = useRef(`device-${user?.id}-${Date.now()}`);

    // Load face-api.js models
    const loadModels = async () => {
        if (faceapiRef.current) return faceapiRef.current;
        try {
            const faceapi = await import('@vladmandic/face-api');
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
            ]);
            faceapiRef.current = faceapi;
            return faceapi;
        } catch (err) {
            throw new Error(`Failed to load face-api models: ${err.message}`);
        }
    };

    // Capture a frame from the local video stream
    const captureFrame = () => {
        if (!localStream) throw new Error('No local stream available');
        const videoTrack = localStream.getVideoTracks()[0];
        if (!videoTrack) throw new Error('No video track');

        const canvas = document.createElement('canvas');
        const video = document.createElement('video');
        video.srcObject = new MediaStream([videoTrack]);
        video.width = 320;
        video.height = 240;

        return new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                video.play();
                canvas.width = video.videoWidth || 320;
                canvas.height = video.videoHeight || 240;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                video.pause();
                resolve(canvas);
            };
            video.onerror = reject;
        });
    };

    /**
     * Enroll biometric template on-device.
     * Raw facial data NEVER leaves the device.
     */
    const enroll = useCallback(async () => {
        setEnrollmentStatus('enrolling');
        setErrorMessage('');

        try {
            const faceapi = await loadModels();
            const db = await openBiometricDB();
            dbRef.current = db;

            const canvas = await captureFrame();
            const detection = await faceapi
                .detectSingleFace(canvas)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                throw new Error('No face detected. Please ensure your face is visible.');
            }

            // Store descriptor locally — never transmitted
            await idbPut(db, STORE_NAME, `descriptor-${user.id}`, Array.from(detection.descriptor));

            // Generate non-extractable ECDSA P-256 key pair
            const keyPair = await crypto.subtle.generateKey(
                { name: 'ECDSA', namedCurve: 'P-256' },
                false, // non-extractable private key
                ['sign', 'verify']
            );
            privateKeyRef.current = keyPair.privateKey;

            // Export public key JWK and store locally
            const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
            await idbPut(db, KEY_STORE_NAME, `pubkey-${user.id}`, publicKeyJwk);

            // Register public key with server (no biometric data sent)
            await axiosInstance.post('/identity/enroll', {
                deviceId: deviceId.current,
                publicKeyJwk,
            });

            setEnrollmentStatus('enrolled');
        } catch (err) {
            console.error('[BiometricEngine] Enrollment failed:', err);
            setEnrollmentStatus('error');
            setErrorMessage(err.message);
        }
    }, [user, localStream]);

    /**
     * Start periodic presence checks.
     */
    const startPresenceChecks = useCallback((intervalMs = PRESENCE_INTERVAL_MS) => {
        if (presenceIntervalRef.current) return;

        presenceIntervalRef.current = setInterval(async () => {
            await runPresenceCheck();
        }, intervalMs);
    }, []);

    const stopPresenceChecks = useCallback(() => {
        if (presenceIntervalRef.current) {
            clearInterval(presenceIntervalRef.current);
            presenceIntervalRef.current = null;
        }
    }, []);

    const runPresenceCheck = async () => {
        if (enrollmentStatus !== 'enrolled' || !privateKeyRef.current) return;

        setPresenceStatus('checking');

        try {
            const db = dbRef.current || await openBiometricDB();
            const storedDescriptor = await idbGet(db, STORE_NAME, `descriptor-${user.id}`);
            if (!storedDescriptor) {
                setPresenceStatus('absent');
                return;
            }

            const faceapi = await loadModels();
            const canvas = await captureFrame();
            const detection = await faceapi
                .detectSingleFace(canvas)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setPresenceStatus('absent');
                await handlePresenceFailure();
                return;
            }

            const distance = euclideanDistance(
                new Float32Array(storedDescriptor),
                detection.descriptor
            );

            if (distance > DESCRIPTOR_THRESHOLD) {
                setPresenceStatus('absent');
                await handlePresenceFailure();
                return;
            }

            // Presence confirmed — sign and send token (no biometric data)
            const payload = {
                userId: user.id,
                deviceId: deviceId.current,
                timestamp: new Date().toISOString(),
                result: 'pass',
            };
            const token = await createVerificationToken(payload, privateKeyRef.current);

            emit('presence:token', {
                deviceId: deviceId.current,
                verificationToken: token,
                meetingId: null,
            });

            setPresenceStatus('present');
        } catch (err) {
            console.error('[BiometricEngine] Presence check error:', err);
            setPresenceStatus('absent');
            await handlePresenceFailure();
        }
    };

    const handlePresenceFailure = async () => {
        // Mute local tracks
        if (localStream) {
            localStream.getAudioTracks().forEach(t => { t.enabled = false; });
            localStream.getVideoTracks().forEach(t => { t.enabled = false; });
        }
        emit('presence:failed', { userId: user?.id, deviceId: deviceId.current });
    };

    /**
     * Respond to a step-up challenge by re-running enrollment.
     */
    const respondToChallenge = useCallback(async () => {
        setPresenceStatus('challenge');
        await enroll();
        if (enrollmentStatus === 'enrolled') {
            emit('identity:challenge-response', { userId: user?.id, deviceId: deviceId.current });
            setPresenceStatus('present');
        }
    }, [enroll, enrollmentStatus, user, emit]);

    // Listen for step-up challenge from server
    useEffect(() => {
        // handled via SocketContext in parent
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopPresenceChecks();
    }, []);

    if (enrollmentStatus === 'idle') {
        return (
            <div className="biometric-engine">
                <div className="biometric-prompt">
                    <span>🔐</span>
                    <button onClick={enroll} className="btn btn-sm btn-primary">
                        Enable Biometric Verification
                    </button>
                </div>
            </div>
        );
    }

    if (enrollmentStatus === 'enrolling') {
        return (
            <div className="biometric-engine">
                <span className="biometric-status enrolling">🔄 Enrolling...</span>
            </div>
        );
    }

    if (enrollmentStatus === 'error') {
        return (
            <div className="biometric-engine">
                <span className="biometric-status error">⚠️ {errorMessage}</span>
                <button onClick={enroll} className="btn btn-sm btn-secondary">Retry</button>
            </div>
        );
    }

    const statusIcon = {
        present: '🟢',
        absent: '🔴',
        checking: '🔄',
        challenge: '⚠️',
        idle: '⚪',
    }[presenceStatus] || '⚪';

    return (
        <div className="biometric-engine">
            <span className="biometric-status" title={`Biometric: ${presenceStatus}`}>
                {statusIcon} ID Verified
            </span>
            {presenceStatus === 'challenge' && (
                <button onClick={respondToChallenge} className="btn btn-sm btn-warning">
                    Re-verify Identity
                </button>
            )}
        </div>
    );
};

export default BiometricEngine;
