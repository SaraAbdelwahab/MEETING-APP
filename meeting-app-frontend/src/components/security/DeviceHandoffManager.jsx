import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

/**
 * DeviceHandoffManager
 *
 * Manages shadow session registration and zero-friction device failover.
 * - On mount: registers as shadow if a primary session exists for this user
 * - Listens for handoff:promote to accept promotion
 * - Exposes initiateHandoff for manual device switch
 */
const DeviceHandoffManager = ({ meetingId, onPromoted, onStateRestored }) => {
    const { user } = useAuth();
    const { socket, emit, on, off, connected } = useSocket();

    const [role, setRole] = useState('unknown'); // unknown | primary | shadow
    const [shadowSessions, setShadowSessions] = useState([]);
    const [handoffPending, setHandoffPending] = useState(false);

    const deviceFingerprint = useRef(computeFingerprint());

    function computeFingerprint() {
        return btoa([
            navigator.hardwareConcurrency || 4,
            navigator.platform || 'unknown',
            `${screen.width}x${screen.height}`,
            new Date().getTimezoneOffset(),
        ].join(':')).slice(0, 32);
    }

    // On mount: attempt to register as shadow if primary already exists
    useEffect(() => {
        if (!connected || !meetingId || !user) return;

        // Emit shadow registration — server will reject if no primary exists
        // and will register as shadow if primary is already active
        emit('handoff:register-shadow', {
            meetingId: parseInt(meetingId),
            deviceFingerprint: deviceFingerprint.current,
        });
    }, [connected, meetingId, user]);

    // Listen for shadow registration confirmation
    useEffect(() => {
        const handleShadowRegistered = (data) => {
            console.log('[HandoffManager] Registered as shadow:', data.shadowSessionId);
            setRole('shadow');
        };
        on('handoff:shadow-registered', handleShadowRegistered);
        return () => off('handoff:shadow-registered', handleShadowRegistered);
    }, [on, off]);

    // Listen for promotion event
    useEffect(() => {
        const handlePromote = async (data) => {
            console.log('[HandoffManager] Promoted to primary device');
            setRole('primary');
            setHandoffPending(false);

            if (data.snapshot) {
                if (onStateRestored) onStateRestored(data.snapshot);
            }

            emit('handoff:accepted', { meetingId: parseInt(meetingId) });
            if (onPromoted) onPromoted(data);
        };
        on('handoff:promote', handlePromote);
        return () => off('handoff:promote', handlePromote);
    }, [on, off, meetingId, onPromoted, onStateRestored]);

    // Listen for snapshot sync (shadow receives state updates)
    useEffect(() => {
        const handleSnapshot = (snapshot) => {
            // Shadow silently receives state — no UI update needed
            // State will be applied on promotion
        };
        on('handoff:snapshot', handleSnapshot);
        return () => off('handoff:snapshot', handleSnapshot);
    }, [on, off]);

    // Listen for handoff errors
    useEffect(() => {
        const handleError = (data) => {
            console.error('[HandoffManager] Handoff error:', data.message);
            setHandoffPending(false);
        };
        on('handoff:error', handleError);
        return () => off('handoff:error', handleError);
    }, [on, off]);

    /**
     * Initiate a manual device handoff to a specific shadow session.
     */
    const initiateHandoff = useCallback((targetShadowId) => {
        setHandoffPending(true);
        emit('handoff:request', {
            targetShadowId,
            meetingId: parseInt(meetingId),
        });
    }, [emit, meetingId]);

    /**
     * Accept promotion (called internally on handoff:promote event).
     */
    const acceptPromotion = useCallback(() => {
        emit('handoff:accepted', { meetingId: parseInt(meetingId) });
    }, [emit, meetingId]);

    // Don't render anything visible for shadow sessions
    if (role === 'shadow') {
        return (
            <div className="handoff-shadow-indicator" title="Shadow session active">
                📱 Shadow
            </div>
        );
    }

    if (role === 'primary' && shadowSessions.length > 0) {
        return (
            <div className="handoff-manager">
                <button
                    className="action-btn handoff-btn"
                    onClick={() => initiateHandoff(shadowSessions[0].id)}
                    disabled={handoffPending}
                    title="Switch to another device"
                >
                    {handoffPending ? '🔄' : '📱'} Switch Device
                </button>
            </div>
        );
    }

    return null;
};

export default DeviceHandoffManager;
