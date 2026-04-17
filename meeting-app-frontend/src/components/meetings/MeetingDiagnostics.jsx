import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useWebRTC } from '../../hooks/useWebRTC';

/**
 * Diagnostic Component - Shows connection and device status
 * Add this temporarily to debug issues
 */
const MeetingDiagnostics = () => {
    const { user, isAuthenticated } = useAuth();
    const { connected, socket } = useSocket();
    const { 
        localStream, 
        isConnecting, 
        error, 
        inCall,
        isAudioEnabled,
        isVideoEnabled 
    } = useWebRTC();

    const [devices, setDevices] = useState({ cameras: 0, mics: 0 });

    useEffect(() => {
        const checkDevices = async () => {
            try {
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                setDevices({
                    cameras: deviceList.filter(d => d.kind === 'videoinput').length,
                    mics: deviceList.filter(d => d.kind === 'audioinput').length
                });
            } catch (err) {
                console.error('Failed to enumerate devices:', err);
            }
        };
        checkDevices();
    }, []);

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            fontFamily: 'monospace'
        }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#60c5ff' }}>🔍 Diagnostics</h4>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>Auth:</strong> {isAuthenticated ? '✅ Logged in' : '❌ Not logged in'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>User:</strong> {user?.email || 'None'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>Socket:</strong> {connected ? '✅ Connected' : '❌ Disconnected'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>Socket ID:</strong> {socket?.id || 'None'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>WebRTC:</strong> {isConnecting ? '⏳ Connecting...' : inCall ? '✅ In call' : '❌ Not in call'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>Local Stream:</strong> {localStream ? '✅ Active' : '❌ None'}
            </div>
            
            {localStream && (
                <>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Video Tracks:</strong> {localStream.getVideoTracks().length}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Audio Tracks:</strong> {localStream.getAudioTracks().length}
                    </div>
                </>
            )}
            
            <div style={{ marginBottom: '8px' }}>
                <strong>Camera:</strong> {isVideoEnabled ? '✅ On' : '❌ Off'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>Microphone:</strong> {isAudioEnabled ? '✅ On' : '❌ Off'}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
                <strong>Devices:</strong> {devices.cameras} cameras, {devices.mics} mics
            </div>
            
            {error && (
                <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    background: 'rgba(239, 68, 68, 0.2)',
                    borderRadius: '4px',
                    color: '#ef4444'
                }}>
                    <strong>Error:</strong><br/>
                    {error}
                </div>
            )}
            
            <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
                Press F12 to see console logs
            </div>
        </div>
    );
};

export default MeetingDiagnostics;
