import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import meetingsAPI from '../../api/meetings';
import { 
    Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
    MessageSquare, PhoneOff, Link2, Check, Wifi, WifiOff, 
    Loader2, Volume2, AlertCircle, Signal, SignalLow, SignalZero
} from 'lucide-react';
import MeetingDiagnostics from './MeetingDiagnostics';
import './MeetingRoomPremium.css';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Prevent NaN and undefined text
const safeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
};

const safeString = (value, fallback = '') => {
    return value != null && value !== undefined ? String(value) : fallback;
};

// Generate avatar from email
function getAvatarData(email, profilePhoto = null) {
    if (profilePhoto) {
        return { type: 'photo', value: profilePhoto };
    }
    
    if (!email) {
        return { type: 'initial', value: 'U', color: '#60c5ff' };
    }
    
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    ];
    
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return {
        type: 'initial',
        value: email.charAt(0).toUpperCase(),
        color: colors[Math.abs(hash) % colors.length]
    };
}

// Local storage helpers for preferences
const PREFS_KEY = 'meeting_preferences';

const savePreferences = (prefs) => {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.error('Failed to save preferences:', e);
    }
};

const loadPreferences = () => {
    try {
        const stored = localStorage.getItem(PREFS_KEY);
        return stored ? JSON.parse(stored) : {
            audioEnabled: true,
            videoEnabled: true,
            chatOpen: false
        };
    } catch (e) {
        console.error('Failed to load preferences:', e);
        return { audioEnabled: true, videoEnabled: true, chatOpen: false };
    }
};

// ============================================================================
// CONNECTION BADGE COMPONENT - Enhanced with real states
// ============================================================================
const ConnectionBadge = ({ connected, isConnecting, networkQuality = 'good' }) => {
    if (isConnecting) {
        return (
            <div 
                className="connection-badge connecting" 
                role="status"
                aria-label="Connecting to meeting"
            >
                <Loader2 size={14} className="spinner-icon" aria-hidden="true" />
                <span>Connecting...</span>
            </div>
        );
    }

    if (!connected) {
        return (
            <div 
                className="connection-badge disconnected"
                role="status"
                aria-label="Disconnected from meeting"
            >
                <WifiOff size={14} aria-hidden="true" />
                <span>Disconnected</span>
            </div>
        );
    }

    // Connected with network quality indicator
    const qualityIcon = networkQuality === 'poor' ? SignalLow : 
                       networkQuality === 'bad' ? SignalZero : Signal;
    const QualityIcon = qualityIcon;

    return (
        <div 
            className={`connection-badge connected quality-${networkQuality}`}
            role="status"
            aria-label={`Connected with ${networkQuality} network quality`}
        >
            <QualityIcon size={14} aria-hidden="true" />
            <span>Connected</span>
        </div>
    );
};

// ============================================================================
// MEETING HEADER COMPONENT
// ============================================================================
const MeetingHeader = ({ meeting, connected, isConnecting, participantCount, onCopyLink, networkQuality }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            const meetingLink = `${window.location.origin}/meeting/${meeting?.id || ''}`;
            await navigator.clipboard.writeText(meetingLink);
            setCopied(true);
            if (onCopyLink) onCopyLink();
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const safeParticipantCount = safeNumber(participantCount, 0);
    const meetingTitle = safeString(meeting?.title, 'Meeting Room');

    return (
        <header className="meeting-header" role="banner">
            <div className="meeting-header-left">
                <h1 className="meeting-title" id="meeting-title">
                    {meetingTitle}
                </h1>
                <ConnectionBadge 
                    connected={connected} 
                    isConnecting={isConnecting}
                    networkQuality={networkQuality}
                />
            </div>

            <div className="meeting-header-right">
                <div className="participants-count" aria-label={`${safeParticipantCount} participants in meeting`}>
                    <div className="participant-icon-group" aria-hidden="true">
                        {[...Array(Math.min(3, safeParticipantCount))].map((_, i) => (
                            <div key={i} className="participant-dot" style={{ zIndex: 3 - i }} />
                        ))}
                    </div>
                    <span>{safeParticipantCount} participant{safeParticipantCount !== 1 ? 's' : ''}</span>
                </div>

                <button 
                    className={`copy-link-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopyLink}
                    aria-label={copied ? 'Meeting link copied' : 'Copy meeting link'}
                >
                    {copied ? (
                        <>
                            <Check size={18} aria-hidden="true" />
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Link2 size={18} aria-hidden="true" />
                            <span>Copy Link</span>
                        </>
                    )}
                </button>
            </div>
        </header>
    );
};

// ============================================================================
// VIDEO TILE COMPONENT - Production-ready with profile photos
// ============================================================================
const VideoTile = ({ 
    stream, 
    email, 
    profilePhoto,
    isLocal, 
    isVideoEnabled, 
    isAudioEnabled,
    isSpeaking,
    isReconnecting,
    size = 'large'
}) => {
    const videoRef = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);
    const [videoError, setVideoError] = useState(false);

    useEffect(() => {
        console.log('🎬 [VideoTile] Effect triggered:', { 
            hasVideoRef: !!videoRef.current, 
            hasStream: !!stream, 
            isVideoEnabled,
            streamId: stream?.id,
            videoTracks: stream?.getVideoTracks().length 
        });
        
        if (videoRef.current && stream && isVideoEnabled) {
            try {
                console.log('📹 [VideoTile] Setting video stream to element');
                videoRef.current.srcObject = stream;
                
                // Wait for video to be ready
                videoRef.current.onloadedmetadata = () => {
                    console.log('✅ [VideoTile] Video metadata loaded, playing...');
                    videoRef.current.play().catch(err => {
                        console.error('❌ [VideoTile] Video play failed:', err);
                    });
                };
                
                setHasVideo(true);
                setVideoError(false);
                console.log('✅ [VideoTile] Video stream set successfully');
            } catch (err) {
                console.error('❌ [VideoTile] Error setting video stream:', err);
                setVideoError(true);
                setHasVideo(false);
            }
        } else {
            console.log('⏭️ [VideoTile] Not showing video:', {
                noVideoRef: !videoRef.current,
                noStream: !stream,
                videoDisabled: !isVideoEnabled
            });
            setHasVideo(false);
        }
    }, [stream, isVideoEnabled]);

    const displayName = isLocal ? 'You' : safeString(email, 'Participant');
    const avatarData = getAvatarData(email, profilePhoto);

    const tileClasses = [
        'video-tile',
        size,
        isSpeaking && 'speaking',
        isReconnecting && 'reconnecting'
    ].filter(Boolean).join(' ');

    return (
        <div 
            className={tileClasses}
            role="article"
            aria-label={`${displayName}${isSpeaking ? ', speaking' : ''}${!isAudioEnabled ? ', muted' : ''}`}
        >
            {/* Video or Avatar */}
            <div className="video-content">
                {/* Always render video element so ref is always available */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="video-element"
                    aria-label={`${displayName} video feed`}
                    style={{ 
                        display: (hasVideo && isVideoEnabled) ? 'block' : 'none',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
                
                {/* Show avatar when video is not showing */}
                {(!hasVideo || !isVideoEnabled) && (
                    <div className="video-avatar-container">
                        {avatarData.type === 'photo' ? (
                            <img 
                                src={avatarData.value} 
                                alt={`${displayName} profile`}
                                className="avatar-photo"
                                onError={(e) => {
                                    // Fallback to initials if photo fails to load
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div 
                            className="video-avatar" 
                            style={{ 
                                background: avatarData.color,
                                display: avatarData.type === 'photo' ? 'none' : 'flex'
                            }}
                        >
                            <span className="avatar-initial" aria-hidden="true">
                                {avatarData.value}
                            </span>
                        </div>
                    </div>
                )}

                {/* Reconnecting Overlay */}
                {isReconnecting && (
                    <div className="reconnecting-overlay" role="alert" aria-live="polite">
                        <Loader2 size={32} className="spinner-icon" aria-hidden="true" />
                        <span>Reconnecting...</span>
                    </div>
                )}
            </div>

            {/* Participant Info Bar */}
            <div className="participant-info-bar">
                <div className="participant-name">
                    <span>{displayName}</span>
                    {!isVideoEnabled && <span className="status-text"> (Camera Off)</span>}
                </div>
                
                <div className="participant-indicators" aria-label="Participant status indicators">
                    {isSpeaking && isAudioEnabled && (
                        <div className="speaking-indicator" aria-label="Speaking">
                            <Volume2 size={14} aria-hidden="true" />
                        </div>
                    )}
                    {!isAudioEnabled && (
                        <div className="muted-indicator" aria-label="Microphone muted">
                            <MicOff size={14} aria-hidden="true" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// PARTICIPANT GRID COMPONENT
// ============================================================================
const ParticipantGrid = ({ 
    localStream, 
    remoteStreams, 
    isVideoEnabled, 
    isAudioEnabled,
    user,
    activeSpeakerId,
    reconnectingUsers
}) => {
    const allParticipants = [];

    // Add local participant
    if (localStream) {
        allParticipants.push({
            id: 'local',
            stream: localStream,
            email: user?.email || 'You',
            profilePhoto: user?.profilePhoto || null,
            isLocal: true,
            isVideoEnabled,
            isAudioEnabled,
            isSpeaking: activeSpeakerId === 'local',
            isReconnecting: false
        });
    }

    // Add remote participants
    Object.entries(remoteStreams || {}).forEach(([userId, streamData]) => {
        allParticipants.push({
            id: userId,
            stream: streamData.stream,
            email: streamData.email || 'Participant',
            profilePhoto: streamData.profilePhoto || null,
            isLocal: false,
            isVideoEnabled: true,
            isAudioEnabled: streamData.isAudioEnabled !== false,
            isSpeaking: activeSpeakerId === userId,
            isReconnecting: reconnectingUsers.has(userId)
        });
    });

    if (allParticipants.length === 0) {
        return null;
    }

    const gridClass = `participant-grid grid-${Math.min(allParticipants.length, 6)}`;

    return (
        <div className={gridClass} role="region" aria-label="Meeting participants">
            {allParticipants.slice(0, 6).map((participant) => (
                <VideoTile
                    key={participant.id}
                    stream={participant.stream}
                    email={participant.email}
                    profilePhoto={participant.profilePhoto}
                    isLocal={participant.isLocal}
                    isVideoEnabled={participant.isVideoEnabled}
                    isAudioEnabled={participant.isAudioEnabled}
                    isSpeaking={participant.isSpeaking}
                    isReconnecting={participant.isReconnecting}
                    size="small"
                />
            ))}
        </div>
    );
};

// ============================================================================
// MAIN VIDEO STAGE COMPONENT
// ============================================================================
const VideoStage = ({ 
    localStream, 
    remoteStreams, 
    isVideoEnabled, 
    isAudioEnabled,
    user,
    activeSpeakerId,
    reconnectingUsers
}) => {
    const [activeParticipant, setActiveParticipant] = useState(null);

    useEffect(() => {
        // Prioritize active speaker, then first remote, then local
        if (activeSpeakerId && activeSpeakerId !== 'local') {
            const remoteData = remoteStreams[activeSpeakerId];
            if (remoteData) {
                setActiveParticipant({
                    id: activeSpeakerId,
                    stream: remoteData.stream,
                    email: remoteData.email || 'Participant',
                    profilePhoto: remoteData.profilePhoto || null,
                    isLocal: false,
                    isVideoEnabled: true,
                    isAudioEnabled: remoteData.isAudioEnabled !== false,
                    isSpeaking: true,
                    isReconnecting: reconnectingUsers.has(activeSpeakerId)
                });
                return;
            }
        }

        const remoteEntries = Object.entries(remoteStreams || {});
        if (remoteEntries.length > 0) {
            const [userId, streamData] = remoteEntries[0];
            setActiveParticipant({
                id: userId,
                stream: streamData.stream,
                email: streamData.email || 'Participant',
                profilePhoto: streamData.profilePhoto || null,
                isLocal: false,
                isVideoEnabled: true,
                isAudioEnabled: streamData.isAudioEnabled !== false,
                isSpeaking: activeSpeakerId === userId,
                isReconnecting: reconnectingUsers.has(userId)
            });
        } else if (localStream) {
            setActiveParticipant({
                id: 'local',
                stream: localStream,
                email: user?.email || 'You',
                profilePhoto: user?.profilePhoto || null,
                isLocal: true,
                isVideoEnabled,
                isAudioEnabled,
                isSpeaking: activeSpeakerId === 'local',
                isReconnecting: false
            });
        } else {
            setActiveParticipant(null);
        }
    }, [remoteStreams, localStream, isVideoEnabled, isAudioEnabled, user, activeSpeakerId, reconnectingUsers]);

    if (!activeParticipant) {
        return (
            <div className="video-stage">
                <div className="video-placeholder" role="status" aria-live="polite">
                    <Loader2 size={64} className="spinner-icon" aria-hidden="true" />
                    <p>Waiting for participants...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="video-stage" role="main" aria-label="Main video stage">
            <VideoTile
                stream={activeParticipant.stream}
                email={activeParticipant.email}
                profilePhoto={activeParticipant.profilePhoto}
                isLocal={activeParticipant.isLocal}
                isVideoEnabled={activeParticipant.isVideoEnabled}
                isAudioEnabled={activeParticipant.isAudioEnabled}
                isSpeaking={activeParticipant.isSpeaking}
                isReconnecting={activeParticipant.isReconnecting}
                size="large"
            />
        </div>
    );
};

// ============================================================================
// CONTROL BAR COMPONENT - With accessibility
// ============================================================================
const ControlBar = ({ 
    isAudioEnabled, 
    isVideoEnabled, 
    isScreenSharing,
    onToggleAudio,
    onToggleVideo,
    onToggleScreen,
    onToggleChat,
    onLeave,
    isChatOpen
}) => {
    return (
        <nav className="control-bar" role="toolbar" aria-label="Meeting controls">
            <div className="control-bar-content">
                <button 
                    className={`control-button ${!isAudioEnabled ? 'off' : ''}`}
                    onClick={onToggleAudio}
                    aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                    aria-pressed={isAudioEnabled}
                >
                    {isAudioEnabled ? <Mic size={22} aria-hidden="true" /> : <MicOff size={22} aria-hidden="true" />}
                </button>

                <button 
                    className={`control-button ${!isVideoEnabled ? 'off' : ''}`}
                    onClick={onToggleVideo}
                    aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    aria-pressed={isVideoEnabled}
                >
                    {isVideoEnabled ? <Video size={22} aria-hidden="true" /> : <VideoOff size={22} aria-hidden="true" />}
                </button>

                <button 
                    className={`control-button ${isScreenSharing ? 'active' : ''}`}
                    onClick={onToggleScreen}
                    aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                    aria-pressed={isScreenSharing}
                >
                    {isScreenSharing ? <MonitorOff size={22} aria-hidden="true" /> : <Monitor size={22} aria-hidden="true" />}
                </button>

                <button 
                    className={`control-button ${isChatOpen ? 'active' : ''}`}
                    onClick={onToggleChat}
                    aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
                    aria-pressed={isChatOpen}
                >
                    <MessageSquare size={22} aria-hidden="true" />
                </button>

                <button 
                    className="control-button leave"
                    onClick={onLeave}
                    aria-label="Leave meeting"
                >
                    <PhoneOff size={22} aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
};

// ============================================================================
// CHAT PANEL COMPONENT
// ============================================================================
const ChatPanel = ({ isOpen, messages, onClose, onSendMessage, currentUserEmail }) => {
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = (e) => {
        e.preventDefault();
        const trimmedMessage = messageText.trim();
        if (trimmedMessage && onSendMessage) {
            onSendMessage(trimmedMessage);
            setMessageText('');
        }
    };

    if (!isOpen) return null;

    return (
        <aside 
            className="chat-panel" 
            role="complementary" 
            aria-label="Meeting chat"
        >
            <div className="chat-header">
                <h3 id="chat-title">Meeting Chat</h3>
                <button 
                    className="chat-close" 
                    onClick={onClose}
                    aria-label="Close chat"
                >
                    ×
                </button>
            </div>
            
            <div 
                className="chat-messages" 
                role="log" 
                aria-live="polite"
                aria-labelledby="chat-title"
            >
                {messages && messages.length > 0 ? (
                    messages.map((msg, index) => {
                        const isOwnMessage = msg.userEmail === currentUserEmail;
                        const isSystem = msg.type === 'system';
                        const senderName = isOwnMessage ? 'You' : safeString(msg.userEmail, 'Participant');
                        
                        return (
                            <div 
                                key={msg.id || index} 
                                className={`chat-message ${isSystem ? 'system' : ''} ${isOwnMessage ? 'own' : ''}`}
                                role="article"
                            >
                                {!isSystem && (
                                    <div 
                                        className="message-avatar" 
                                        style={{ background: getAvatarData(msg.userEmail).color }}
                                        aria-hidden="true"
                                    >
                                        {getAvatarData(msg.userEmail).value}
                                    </div>
                                )}
                                <div className="message-content">
                                    {!isSystem && (
                                        <div className="message-sender">
                                            {senderName}
                                        </div>
                                    )}
                                    <div className="message-text">{safeString(msg.message, '')}</div>
                                    <div className="message-time">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        }) : ''}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="chat-empty" role="status">
                        <MessageSquare size={48} aria-hidden="true" />
                        <p>No messages yet</p>
                        <span>Start the conversation</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSend}>
                <label htmlFor="chat-input" className="sr-only">Type a message</label>
                <input
                    id="chat-input"
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                    maxLength={500}
                />
                <button 
                    type="submit" 
                    className="chat-send" 
                    disabled={!messageText.trim()}
                    aria-label="Send message"
                >
                    Send
                </button>
            </form>
        </aside>
    );
};

// ============================================================================
// MAIN MEETING ROOM COMPONENT - Production Ready
// ============================================================================
const MeetingRoomProduction = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { connected, joinMeeting, leaveMeeting, sendMessage, onMessage, offMessage } = useSocket();
    const { 
        localStream,
        remoteStreams,
        inCall, 
        joinCall, 
        leaveCall,
        toggleAudio,
        toggleVideo,
        shareScreen,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        isConnecting,
        error: webrtcError
    } = useWebRTC();

    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasJoined, setHasJoined] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);
    const [reconnectingUsers, setReconnectingUsers] = useState(new Set());
    const [networkQuality, setNetworkQuality] = useState('good'); // good, poor, bad
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Refs for cleanup
    const cleanupRef = useRef(false);
    const messageListenerRef = useRef(null);

    // Load preferences on mount
    useEffect(() => {
        const prefs = loadPreferences();
        setIsChatOpen(prefs.chatOpen);
    }, []);

    // Save preferences when they change
    useEffect(() => {
        if (hasJoined) {
            savePreferences({
                audioEnabled: isAudioEnabled,
                videoEnabled: isVideoEnabled,
                chatOpen: isChatOpen
            });
        }
    }, [isAudioEnabled, isVideoEnabled, isChatOpen, hasJoined]);

    // Fetch meeting details
    useEffect(() => {
        const fetchMeeting = async () => {
            if (!id || !user) return;
            
            try {
                setLoading(true);
                const response = await meetingsAPI.getMeeting(id);
                setMeeting(response.meeting);
                
                const isParticipant = response.meeting.participants?.some(
                    p => p.id === user?.id
                ) || response.meeting.created_by === user?.id;
                
                setHasJoined(isParticipant);
            } catch (err) {
                console.error('Failed to load meeting:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchMeeting();
    }, [id, user]);

    // Join meeting room with cleanup
    useEffect(() => {
        console.log('🔍 [MeetingRoom] Join effect triggered:', { id, connected, hasJoined, inCall, cleanupRef: cleanupRef.current });
        
        if (!id || !connected || !hasJoined || cleanupRef.current) {
            console.log('⏭️ [MeetingRoom] Skipping join - conditions not met');
            return;
        }
        
        // Only join if not already in call
        if (inCall) {
            console.log('⏭️ [MeetingRoom] Already in call, skipping');
            return;
        }

        console.log('🚀 [MeetingRoom] Joining meeting room:', id);
        console.log('📞 [MeetingRoom] Calling joinMeeting and joinCall...');
        
        joinMeeting(id);
        joinCall(id);
        
        return () => {
            if (!cleanupRef.current) {
                cleanupRef.current = true;
                console.log('🔌 [MeetingRoom] Leaving meeting room:', id);
                leaveMeeting(id);
                leaveCall();
            }
        };
    }, [id, connected, hasJoined, inCall, joinMeeting, joinCall, leaveMeeting, leaveCall]);

    // Listen for messages with cleanup
    useEffect(() => {
        const handleNewMessage = (message) => {
            setMessages(prev => [...prev, message]);
        };

        messageListenerRef.current = handleNewMessage;
        onMessage(handleNewMessage);
        
        return () => {
            offMessage();
            messageListenerRef.current = null;
        };
    }, [onMessage, offMessage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupRef.current = true;
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            }
        };
    }, [localStream]);

    // Monitor network quality (simulated - replace with real implementation)
    useEffect(() => {
        if (!connected || !inCall) {
            setNetworkQuality('good');
            return;
        }

        const interval = setInterval(() => {
            // In production, use WebRTC stats API to measure actual network quality
            const random = Math.random();
            if (random > 0.9) {
                setNetworkQuality('poor');
            } else if (random > 0.95) {
                setNetworkQuality('bad');
            } else {
                setNetworkQuality('good');
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [connected, inCall]);

    // Simulate speaking detection (replace with real audio level detection)
    useEffect(() => {
        if (!isAudioEnabled) {
            setActiveSpeakerId(null);
            return;
        }

        const interval = setInterval(() => {
            const allIds = ['local', ...Object.keys(remoteStreams || {})];
            if (allIds.length > 0) {
                const randomId = allIds[Math.floor(Math.random() * allIds.length)];
                setActiveSpeakerId(randomId);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [remoteStreams, isAudioEnabled]);

    // Handle permission denied
    useEffect(() => {
        if (webrtcError && webrtcError.includes('denied')) {
            setPermissionDenied(true);
        }
    }, [webrtcError]);

    const handleSendMessage = useCallback((text) => {
        if (sendMessage && id) {
            sendMessage(id, text);
        }
    }, [sendMessage, id]);

    const handleLeave = useCallback(() => {
        if (window.confirm('Leave this meeting?')) {
            cleanupRef.current = true;
            leaveCall();
            navigate('/dashboard');
        }
    }, [leaveCall, navigate]);

    const handleCopyLink = useCallback(() => {
        console.log('Meeting link copied!');
    }, []);

    const handleToggleChat = useCallback(() => {
        setIsChatOpen(prev => !prev);
    }, []);

    // Manual camera start (fallback if automatic doesn't work)
    const handleStartCamera = useCallback(async () => {
        console.log('🎥 [MeetingRoom] Manual camera start triggered');
        try {
            if (!inCall && id) {
                console.log('📞 [MeetingRoom] Manually calling joinCall...');
                await joinCall(id);
            } else if (inCall) {
                console.log('✅ [MeetingRoom] Already in call');
            } else {
                console.error('❌ [MeetingRoom] No meeting ID');
            }
        } catch (err) {
            console.error('❌ [MeetingRoom] Manual camera start failed:', err);
            alert('Failed to start camera: ' + err.message);
        }
    }, [id, inCall, joinCall]);

    // Loading state
    if (loading) {
        return (
            <div className="meeting-room-premium">
                <div className="loading-screen" role="status" aria-live="polite">
                    <Loader2 size={64} className="spinner-icon" aria-hidden="true" />
                    <p>Loading meeting...</p>
                </div>
            </div>
        );
    }

    // Not joined state
    if (!hasJoined) {
        return (
            <div className="meeting-room-premium">
                <div className="join-screen">
                    <div className="join-card">
                        <div className="join-icon" aria-hidden="true">🎥</div>
                        <h2>{safeString(meeting?.title, 'Meeting Room')}</h2>
                        <p>Join this meeting to start collaborating</p>
                        <button 
                            className="join-button"
                            onClick={async () => {
                                try {
                                    await meetingsAPI.joinMeeting(id);
                                    setHasJoined(true);
                                } catch (err) {
                                    console.error('Failed to join:', err);
                                    alert('Failed to join meeting. Please try again.');
                                }
                            }}
                            aria-label="Join meeting"
                        >
                            Join Meeting
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Permission denied state
    if (permissionDenied || webrtcError) {
        return (
            <div className="meeting-room-premium">
                <div className="join-screen">
                    <div className="join-card error-card" role="alert">
                        <div className="error-icon" aria-hidden="true">
                            <AlertCircle size={64} />
                        </div>
                        <h2>Camera/Microphone Access Required</h2>
                        <p style={{ whiteSpace: 'pre-line' }}>
                            {safeString(webrtcError, 'Please allow camera and microphone access to join the meeting.')}
                        </p>
                        <div className="error-actions">
                            <button 
                                className="join-button"
                                onClick={() => window.location.reload()}
                                aria-label="Refresh page and try again"
                            >
                                Refresh & Try Again
                            </button>
                            <button 
                                className="join-button secondary"
                                onClick={() => navigate('/dashboard')}
                                aria-label="Return to dashboard"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const totalParticipants = safeNumber(1 + Object.keys(remoteStreams || {}).length, 1);

    // Show "Start Camera" button if not in call
    const showStartCameraButton = !inCall && !isConnecting && !webrtcError;

    return (
        <div className="meeting-room-premium" role="application" aria-labelledby="meeting-title">
            {/* Diagnostic overlay - remove in production */}
            <MeetingDiagnostics />
            
            {/* Manual Start Camera Button (if not in call) */}
            {showStartCameraButton && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10000,
                    background: 'rgba(0, 0, 0, 0.9)',
                    padding: '40px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    border: '2px solid #60c5ff'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎥</div>
                    <h2 style={{ color: 'white', marginBottom: '10px' }}>Camera Not Started</h2>
                    <p style={{ color: '#ccc', marginBottom: '30px' }}>
                        Click below to start your camera and microphone
                    </p>
                    <button
                        onClick={handleStartCamera}
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '15px 40px',
                            borderRadius: '8px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        🎥 Start Camera & Microphone
                    </button>
                    <p style={{ color: '#888', marginTop: '20px', fontSize: '14px' }}>
                        You'll be asked to allow camera and microphone access
                    </p>
                </div>
            )}
            
            <MeetingHeader 
                meeting={meeting}
                connected={connected && inCall}
                isConnecting={isConnecting}
                participantCount={totalParticipants}
                onCopyLink={handleCopyLink}
                networkQuality={networkQuality}
            />

            <div className="meeting-content">
                <div className="video-area">
                    <VideoStage 
                        localStream={localStream}
                        remoteStreams={remoteStreams}
                        isVideoEnabled={isVideoEnabled}
                        isAudioEnabled={isAudioEnabled}
                        user={user}
                        activeSpeakerId={activeSpeakerId}
                        reconnectingUsers={reconnectingUsers}
                    />
                    <ParticipantGrid 
                        localStream={localStream}
                        remoteStreams={remoteStreams}
                        isVideoEnabled={isVideoEnabled}
                        isAudioEnabled={isAudioEnabled}
                        user={user}
                        activeSpeakerId={activeSpeakerId}
                        reconnectingUsers={reconnectingUsers}
                    />
                </div>

                <ChatPanel 
                    isOpen={isChatOpen}
                    messages={messages}
                    onClose={handleToggleChat}
                    onSendMessage={handleSendMessage}
                    currentUserEmail={user?.email}
                />
            </div>

            <ControlBar 
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isScreenSharing={isScreenSharing}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onToggleScreen={shareScreen}
                onToggleChat={handleToggleChat}
                onLeave={handleLeave}
                isChatOpen={isChatOpen}
            />
        </div>
    );
};

export default MeetingRoomProduction;
