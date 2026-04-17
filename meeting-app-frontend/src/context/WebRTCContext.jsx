import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import SimplePeer from 'simple-peer';

// ✅ Export the context
export const WebRTCContext = createContext(null);

export const useWebRTC = () => {
    const context = useContext(WebRTCContext);
    if (!context) {
        throw new Error('useWebRTC must be used within a WebRTCProvider');
    }
    return context;
};

export const WebRTCProvider = ({ children }) => {
    const { user } = useAuth();
    const { socket, onlineUsers } = useSocket();
    
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [inCall, setInCall] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    
    const peersRef = useRef({});
    const localStreamRef = useRef(null);

    useEffect(() => {
        return () => {
            if (inCall) {
                leaveCall();
            }
        };
    }, []);

    // IMPROVED: More robust initializeMedia function with timeout
    const initializeMedia = async () => {
        try {
            setError(null);
            setIsConnecting(true);
            
            console.log('🎥 [WebRTC] Requesting camera and microphone access...');
            
            // Try to check permissions (may fail in some browsers, that's OK)
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const permissions = await navigator.permissions.query({ name: 'camera' });
                    const micPermissions = await navigator.permissions.query({ name: 'microphone' });
                    console.log('📹 [WebRTC] Camera permission state:', permissions.state);
                    console.log('🎤 [WebRTC] Microphone permission state:', micPermissions.state);
                    
                    if (permissions.state === 'denied' || micPermissions.state === 'denied') {
                        throw new Error('NotAllowedError: Permission denied');
                    }
                }
            } catch (permError) {
                if (permError.message.includes('denied')) {
                    throw permError;
                }
                console.log('⚠️ [WebRTC] Permissions API not fully supported, continuing anyway');
            }
            
            // Add timeout to prevent hanging forever
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout: Camera/microphone request took too long. Please check if permission popup is blocked.')), 30000);
            });
            
            // Request media with specific constraints
            const mediaPromise = navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }, 
                audio: true 
            });
            
            console.log('⏳ [WebRTC] Waiting for user to allow camera/microphone...');
            const stream = await Promise.race([mediaPromise, timeoutPromise]);
            
            console.log('✅ [WebRTC] Media stream acquired successfully!');
            console.log('📹 [WebRTC] Video tracks:', stream.getVideoTracks().length);
            console.log('🎤 [WebRTC] Audio tracks:', stream.getAudioTracks().length);
            
            // Log track details
            stream.getVideoTracks().forEach((track, index) => {
                console.log(`📹 [WebRTC] Video track ${index}:`, track.label, 'enabled:', track.enabled, 'readyState:', track.readyState);
            });
            stream.getAudioTracks().forEach((track, index) => {
                console.log(`🎤 [WebRTC] Audio track ${index}:`, track.label, 'enabled:', track.enabled, 'readyState:', track.readyState);
            });
            
            // Ensure tracks are enabled
            stream.getVideoTracks().forEach(track => {
                track.enabled = true;
                console.log(`✅ [WebRTC] Enabled video track: ${track.label}`);
            });
            stream.getAudioTracks().forEach(track => {
                track.enabled = true;
                console.log(`✅ [WebRTC] Enabled audio track: ${track.label}`);
            });
            
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsVideoEnabled(true);
            setIsAudioEnabled(true);
            setIsConnecting(false);
            setError(null);
            
            console.log('✅ [WebRTC] Local stream set, video enabled:', true, 'audio enabled:', true);
            return stream;
            
        } catch (error) {
            console.error('❌ [WebRTC] Error accessing media devices:', error);
            console.error('❌ [WebRTC] Error name:', error.name);
            console.error('❌ [WebRTC] Error message:', error.message);
            setIsConnecting(false);
            
            let errorMessage = '';
            
            if (error.message.includes('Timeout')) {
                errorMessage = '⏱️ Camera/microphone request timed out.\n\nThe permission popup might be blocked or hidden. Please:\n1. Check if popup is blocked (look for icon in address bar)\n2. Click the camera icon in address bar\n3. Allow camera and microphone\n4. Refresh the page';
            } else if (error.name === 'NotAllowedError' || error.message.includes('denied')) {
                errorMessage = '❌ Camera and microphone access denied.\n\nPlease:\n1. Click the lock icon 🔒 in the address bar\n2. Change camera to "Allow"\n3. Change microphone to "Allow"\n4. Refresh the page (F5)';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '❌ No camera or microphone found.\n\nPlease connect a camera and microphone to your device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '❌ Camera or microphone is already in use.\n\nPlease close other applications that might be using your camera:\n- Zoom\n- Microsoft Teams\n- OBS Studio\n- Skype\n- Other browser tabs';
            } else if (error.name === 'SecurityError') {
                errorMessage = '❌ Camera access blocked by browser security settings.\n\nPlease check your browser security settings.';
            } else if (error.name === 'AbortError') {
                errorMessage = '❌ Permission request was cancelled.\n\nPlease click the permission popup and select "Allow".';
            } else {
                errorMessage = `❌ Failed to access camera/microphone: ${error.message}`;
            }
            
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const joinCall = async (meetingId) => {
        try {
            console.log('🎥 [WebRTC] Starting joinCall for meeting:', meetingId);
            setIsConnecting(true);
            setError(null);
            
            // Check if socket is connected
            if (!socket || !socket.connected) {
                console.error('❌ [WebRTC] Socket not connected');
                throw new Error('Socket not connected. Please wait for connection.');
            }
            
            console.log('🎥 [WebRTC] Socket is connected, initializing media...');
            
            // Initialize media stream FIRST
            let stream = localStreamRef.current;
            if (!stream) {
                console.log('🎥 [WebRTC] No existing stream, requesting camera/mic...');
                stream = await initializeMedia();
                console.log('✅ [WebRTC] Media initialized successfully');
            } else {
                console.log('✅ [WebRTC] Using existing media stream');
            }

            // Set up socket event listeners BEFORE emitting join-call
            console.log('🎥 [WebRTC] Setting up socket event listeners...');
            socket.on('user-joined-call', handleUserJoined);
            socket.on('receive-offer', handleReceiveOffer);
            socket.on('receive-answer', handleReceiveAnswer);
            socket.on('ice-candidate', handleICECandidate);
            socket.on('user-left-call', handleUserLeft);
            console.log('✅ [WebRTC] Socket listeners registered');

            // NOW emit join-call
            console.log('📞 [WebRTC] Emitting join-call event for meeting:', meetingId);
            socket.emit('join-call', { meetingId });
            
            setInCall(true);
            console.log('✅ [WebRTC] Successfully joined call');

        } catch (error) {
            console.error('❌ [WebRTC] Error joining call:', error);
            setError(error.message);
            setInCall(false);
        } finally {
            setIsConnecting(false);
        }
    };

    // Standalone function to start camera without joining call
    const startCamera = async () => {
        try {
            console.log('🎥 [WebRTC] Starting camera (standalone)...');
            setIsConnecting(true);
            setError(null);
            
            // Initialize media stream
            const stream = await initializeMedia();
            console.log('✅ [WebRTC] Camera started successfully');
            
            return stream;
        } catch (error) {
            console.error('❌ [WebRTC] Error starting camera:', error);
            setError(error.message);
            throw error;
        } finally {
            setIsConnecting(false);
        }
    };

    const leaveCall = () => {
        console.log('📞 Leaving call...');
        Object.values(peersRef.current).forEach(peer => peer.destroy());
        peersRef.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        setRemoteStreams({});
        setParticipants([]);
        setInCall(false);
        setError(null);

        socket.off('user-joined-call');
        socket.off('receive-offer');
        socket.off('receive-answer');
        socket.off('ice-candidate');
        socket.off('user-left-call');
    };

    const handleUserJoined = async ({ userId, userEmail }) => {
        if (userId === user?.id) return;
        
        console.log('👤 User joined call:', userEmail);

        try {
            setParticipants(prev => {
                if (prev.some(p => p.id === userId)) return prev;
                return [...prev, { id: userId, email: userEmail }];
            });

            const peer = new SimplePeer({
                initiator: true,
                trickle: false,
                stream: localStreamRef.current
            });

            peer.on('signal', (data) => {
                console.log('📤 Sending offer to:', userEmail);
                socket.emit('send-offer', {
                    targetUserId: userId,
                    offer: data
                });
            });

            peer.on('stream', (remoteStream) => {
                console.log('📥 Received stream from:', userEmail);
                setRemoteStreams(prev => ({
                    ...prev,
                    [userId]: {
                        stream: remoteStream,
                        email: userEmail
                    }
                }));
            });

            peer.on('error', (err) => {
                console.error('Peer connection error:', err);
            });

            peersRef.current[userId] = peer;

        } catch (error) {
            console.error('Error creating peer connection:', error);
        }
    };

    const handleReceiveOffer = async ({ fromUserId, fromUserEmail, offer }) => {
        console.log('📥 Received offer from:', fromUserEmail);
        
        try {
            setParticipants(prev => {
                if (prev.some(p => p.id === fromUserId)) return prev;
                return [...prev, { id: fromUserId, email: fromUserEmail }];
            });

            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: localStreamRef.current
            });

            peer.on('signal', (data) => {
                console.log('📤 Sending answer to:', fromUserEmail);
                socket.emit('send-answer', {
                    targetUserId: fromUserId,
                    answer: data
                });
            });

            peer.on('stream', (remoteStream) => {
                console.log('📥 Received stream from:', fromUserEmail);
                setRemoteStreams(prev => ({
                    ...prev,
                    [fromUserId]: {
                        stream: remoteStream,
                        email: fromUserEmail
                    }
                }));
            });

            peer.on('error', (err) => {
                console.error('Peer connection error:', err);
            });

            peer.signal(offer);
            peersRef.current[fromUserId] = peer;

        } catch (error) {
            console.error('Error handling offer:', error);
        }
    };

    const handleReceiveAnswer = ({ fromUserId, answer }) => {
        console.log('📥 Received answer from user:', fromUserId);
        const peer = peersRef.current[fromUserId];
        if (peer) {
            peer.signal(answer);
        }
    };

    const handleICECandidate = ({ fromUserId, candidate }) => {
        console.log('📥 Received ICE candidate from user:', fromUserId);
        const peer = peersRef.current[fromUserId];
        if (peer) {
            peer.signal(candidate);
        }
    };

    const handleUserLeft = ({ userId }) => {
        console.log('👤 User left call:', userId);
        setParticipants(prev => prev.filter(p => p.id !== userId));
        
        if (peersRef.current[userId]) {
            peersRef.current[userId].destroy();
            delete peersRef.current[userId];
        }

        setRemoteStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[userId];
            return newStreams;
        });
    };

    const toggleAudio = () => {
        console.log('🎤 [WebRTC] toggleAudio called');
        console.log('🎤 [WebRTC] localStreamRef.current:', localStreamRef.current);
        
        if (!localStreamRef.current) {
            console.error('❌ [WebRTC] No local stream available for audio toggle');
            return;
        }
        
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        console.log('🎤 [WebRTC] Audio track:', audioTrack);
        
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsAudioEnabled(audioTrack.enabled);
            console.log('🎤 [WebRTC] Audio toggled:', audioTrack.enabled ? 'enabled' : 'disabled');
        } else {
            console.error('❌ [WebRTC] No audio track found in stream');
        }
    };

    const toggleVideo = () => {
        console.log('📹 [WebRTC] toggleVideo called');
        console.log('📹 [WebRTC] localStreamRef.current:', localStreamRef.current);
        
        if (!localStreamRef.current) {
            console.error('❌ [WebRTC] No local stream available for video toggle');
            return;
        }
        
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        console.log('📹 [WebRTC] Video track:', videoTrack);
        
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoEnabled(videoTrack.enabled);
            console.log('📹 [WebRTC] Video toggled:', videoTrack.enabled ? 'enabled' : 'disabled');
        } else {
            console.error('❌ [WebRTC] No video track found in stream');
        }
    };

    const shareScreen = async () => {
        try {
            if (isScreenSharing) {
                console.log('🖥️ Stopping screen share, reverting to camera...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                
                const videoTrack = stream.getVideoTracks()[0];
                Object.values(peersRef.current).forEach(peer => {
                    peer.replaceTrack(
                        localStreamRef.current.getVideoTracks()[0],
                        videoTrack,
                        stream
                    );
                });

                localStreamRef.current = stream;
                setLocalStream(stream);
                setIsScreenSharing(false);
            } else {
                console.log('🖥️ Starting screen share...');
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                const videoTrack = stream.getVideoTracks()[0];
                Object.values(peersRef.current).forEach(peer => {
                    peer.replaceTrack(
                        localStreamRef.current.getVideoTracks()[0],
                        videoTrack,
                        stream
                    );
                });

                videoTrack.onended = () => {
                    console.log('🖥️ Screen share stopped by user');
                    shareScreen();
                };

                localStreamRef.current = stream;
                setLocalStream(stream);
                setIsScreenSharing(true);
            }
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    const startScreenShare = async () => {
        try {
            console.log('🖥️ Starting screen share...');
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            const videoTrack = stream.getVideoTracks()[0];
            Object.values(peersRef.current).forEach(peer => {
                peer.replaceTrack(
                    localStreamRef.current.getVideoTracks()[0],
                    videoTrack,
                    stream
                );
            });

            videoTrack.onended = () => {
                console.log('🖥️ Screen share stopped by user');
                stopScreenShare();
            };

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsScreenSharing(true);
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    const stopScreenShare = async () => {
        try {
            console.log('🖥️ Stopping screen share, reverting to camera...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            const videoTrack = stream.getVideoTracks()[0];
            Object.values(peersRef.current).forEach(peer => {
                peer.replaceTrack(
                    localStreamRef.current.getVideoTracks()[0],
                    videoTrack,
                    stream
                );
            });

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsScreenSharing(false);
        } catch (error) {
            console.error('Error stopping screen share:', error);
        }
    };

    const value = {
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        inCall,
        participants,
        isConnecting,
        error,
        joinCall,
        leaveCall,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        shareScreen,
        startCamera
    };

    return (
        <WebRTCContext.Provider value={value}>
            {children}
        </WebRTCContext.Provider>
    );
};