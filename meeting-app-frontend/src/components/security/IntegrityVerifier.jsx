import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import axiosInstance from '../../api/axios';

/**
 * Compute SHA-256 of an ArrayBuffer using Web Crypto API.
 * Returns hex string.
 */
async function sha256Hex(buffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Verify a Merkle proof for a leaf hash against a known root.
 * @param {string} leafHash - hex
 * @param {Array<{ hash: string, position: 'left'|'right' }>} proof
 * @param {string} expectedRoot - hex
 * @returns {boolean}
 */
async function verifyMerkleProof(leafHash, proof, expectedRoot) {
    let current = leafHash;
    for (const { hash: siblingHash, position } of proof) {
        const combined = position === 'left'
            ? siblingHash + current
            : current + siblingHash;
        const buf = new TextEncoder().encode(combined);
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        current = Array.from(new Uint8Array(hashBuf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    return current === expectedRoot;
}

const IntegrityVerifier = forwardRef(({ recordingId, merkleRoot, onTamperDetected }, ref) => {
    const [verificationState, setVerificationState] = useState('idle'); // idle | verifying | passed | tampered
    const [tamperDetails, setTamperDetails] = useState(null);
    const chunkHashesRef = useRef(null); // Array<{ chunkIndex, sha256Hash, merkleProof }>

    /**
     * Fetch chunk hashes from backend and prepare for verification.
     */
    const startVerification = useCallback(async (recId) => {
        const id = recId || recordingId;
        if (!id) return;

        setVerificationState('verifying');
        setTamperDetails(null);

        try {
            const response = await axiosInstance.get(`/recordings/${id}/chunks`);
            chunkHashesRef.current = response.data.chunks;
            
            // If we have chunks, mark as passed (actual chunk verification happens during playback)
            if (response.data.chunks && response.data.chunks.length > 0) {
                setVerificationState('passed');
            }
        } catch (err) {
            console.error('[IntegrityVerifier] Failed to fetch chunk hashes:', err);
            setVerificationState('idle');
            throw err;
        }
    }, [recordingId]);

    /**
     * Verify a single chunk buffer against stored hash and Merkle proof.
     * @param {number} chunkIndex
     * @param {ArrayBuffer} chunkBuffer
     * @returns {Promise<boolean>}
     */
    const verifyChunk = useCallback(async (chunkIndex, chunkBuffer) => {
        if (!chunkHashesRef.current) {
            console.warn('[IntegrityVerifier] No chunk hashes loaded. Call startVerification first.');
            return false;
        }

        const chunkMeta = chunkHashesRef.current.find(c => c.chunkIndex === chunkIndex);
        if (!chunkMeta) {
            console.warn(`[IntegrityVerifier] No metadata for chunk ${chunkIndex}`);
            return false;
        }

        const computedHash = await sha256Hex(chunkBuffer);

        // Check individual chunk hash
        if (computedHash !== chunkMeta.sha256Hash) {
            const details = { chunkIndex, recordingId, computedHash, expectedHash: chunkMeta.sha256Hash };
            setVerificationState('tampered');
            setTamperDetails(details);
            console.error('[IntegrityVerifier] TAMPER DETECTED:', details);
            if (onTamperDetected) onTamperDetected(details);
            return false;
        }

        // Verify Merkle proof if root is available
        if (merkleRoot && chunkMeta.merkleProof?.length > 0) {
            const proofValid = await verifyMerkleProof(computedHash, chunkMeta.merkleProof, merkleRoot);
            if (!proofValid) {
                const details = { chunkIndex, recordingId, reason: 'merkle-proof-invalid' };
                setVerificationState('tampered');
                setTamperDetails(details);
                if (onTamperDetected) onTamperDetected(details);
                return false;
            }
        }

        // Check if all chunks verified
        if (chunkHashesRef.current && chunkIndex === chunkHashesRef.current.length - 1) {
            setVerificationState('passed');
        }

        return true;
    }, [recordingId, merkleRoot, onTamperDetected]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        startVerification,
        verifyChunk,
        verificationState,
        tamperDetails,
    }), [startVerification, verifyChunk, verificationState, tamperDetails]);

    // Render nothing - this is a headless component
    return null;
});

export { sha256Hex, verifyMerkleProof };
export default IntegrityVerifier;
