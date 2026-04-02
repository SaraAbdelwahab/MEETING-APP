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

    // IMPROVED: More robust initializeMedia function
    const initializeMedia = async () => {
        try {
            setError(null);
            setIsConnecting(true);
            
            console.log('🎥 Requesting camera and microphone access...');
            
            // Try to check permissions (may fail in some browsers, that's OK)
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const permissions = await navigator.permissions.query({ name: 'camera' });
                    const micPermissions = await navigator.permissions.query({ name: 'microphone' });
                    console.log('Camera permission state:', permissions.state);
                    console.log('Microphone permission state:', micPermissions.state);
                }
            } catch (permError) {
                console.log('Permissions API not fully supported, continuing anyway');
            }
            
            // Request media with specific constraints
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }, 
                audio: true 
            });
            
            console.log('✅ Media stream acquired successfully!');
            console.log('📹 Video tracks:', stream.getVideoTracks().length);
            console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
            
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsConnecting(false);
            setError(null);
            return stream;
            
        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            setIsConnecting(false);
            
            let errorMessage = '';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = '❌ Camera and microphone access denied.\n\nPlease click the lock icon 🔒 in the address bar, allow camera and microphone, then refresh the page.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '❌ No camera or microphone found.\n\nPlease connect a camera and microphone to your device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '❌ Camera or microphone is already in use.\n\nPlease close other applications that might be using your camera (Zoom, Teams, OBS, etc.).';
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
            setIsConnecting(true);
            setError(null);
            
            let stream = localStreamRef.current;
            if (!stream) {
                stream = await initializeMedia();
            }

            setInCall(true);

            socket.on('user-joined-call', handleUserJoined);
            socket.on('receive-offer', handleReceiveOffer);
            socket.on('receive-answer', handleReceiveAnswer);
            socket.on('ice-candidate', handleICECandidate);
            socket.on('user-left-call', handleUserLeft);

            socket.emit('join-call', { meetingId });
            console.log('📞 Emitted join-call event for meeting:', meetingId);

        } catch (error) {
            console.error('Error joining call:', error);
            setError(error.message);
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
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
                console.log('🎤 Audio:', audioTrack.enabled ? 'enabled' : 'disabled');
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
                console.log('📹 Video:', videoTrack.enabled ? 'enabled' : 'disabled');
            }
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
        shareScreen
    };

    return (
        <WebRTCContext.Provider value={value}>
            {children}
        </WebRTCContext.Provider>
    );
};