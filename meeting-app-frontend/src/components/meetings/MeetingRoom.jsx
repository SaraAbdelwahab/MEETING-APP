// src/components/meetings/MeetingRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import meetingsAPI from '../../api/meetings';
import CallInterface from '../video/CallInterface';
import ChatRoom from '../chat/ChatRoom';
import BiometricEngine from '../security/BiometricEngine';
import DeviceHandoffManager from '../security/DeviceHandoffManager';
import { 
    Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
    MessageSquare, Users, PhoneOff, Settings, ArrowLeft,
    Calendar, Clock, Timer
} from 'lucide-react';
import './MeetingRoom.css';

const MeetingRoom = () => {
    // 1. Get meeting ID from URL using useParams()
    const { id } = useParams();
    
    // 2. Get navigation function using useNavigate()
    const navigate = useNavigate();
    
    // 3. Get authentication data using useAuth()
    const { user, isAuthenticated } = useAuth();
    
    // 4. Get socket connection using useSocket()
    const { connected, onlineUsers, joinMeeting, leaveMeeting, emit } = useSocket();
    
    // 5. Get WebRTC functionality using useWebRTC()
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
    } = useWebRTC();

    // Refs to track current WebRTC state for snapshot sync
    const isAudioEnabledRef = useRef(isAudioEnabled);
    const isVideoEnabledRef = useRef(isVideoEnabled);
    const isScreenSharingRef = useRef(isScreenSharing);
    useEffect(() => { isAudioEnabledRef.current = isAudioEnabled; }, [isAudioEnabled]);
    useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);
    useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

    // Local state
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showChat, setShowChat] = useState(true);
    const [showParticipants, setShowParticipants] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const callStartTimeRef = useRef(null);
    const snapshotIntervalRef = useRef(null);

    // Fetch meeting details
    useEffect(() => {
        const fetchMeeting = async () => {
            try {
                setLoading(true);
                const response = await meetingsAPI.getMeeting(id);
                setMeeting(response.meeting);
                
                // Check if user is a participant
                const isParticipant = response.meeting.participants?.some(
                    p => p.id === user?.id
                ) || response.meeting.created_by === user?.id;
                
                setHasJoined(isParticipant);
                
            } catch (err) {
                setError(err.message || 'Failed to load meeting');
            } finally {
                setLoading(false);
            }
        };
        
        if (id && user) {
            fetchMeeting();
        }
    }, [id, user, navigate]);

    // Handle joining meeting
    const handleJoinMeeting = async () => {
        try {
            setIsJoining(true);
            await meetingsAPI.joinMeeting(id);
            setHasJoined(true);
            
            // Refresh meeting data
            const response = await meetingsAPI.getMeeting(id);
            setMeeting(response.meeting);
        } catch (err) {
            setError(err.message || 'Failed to join meeting');
        } finally {
            setIsJoining(false);
        }
    };

    // Join Socket.IO room when component mounts (only if user has joined)
    useEffect(() => {
        if (id && connected && hasJoined) {
            joinMeeting(id);
            callStartTimeRef.current = Date.now();
            
            // Auto-join video call when entering meeting room
            joinCall(id);

            // Start snapshot sync loop every 2 seconds for handoff continuity
            snapshotIntervalRef.current = setInterval(() => {
                emit('handoff:snapshot', {
                    meetingId: parseInt(id),
                    muteState: !isAudioEnabledRef.current,
                    cameraState: isVideoEnabledRef.current,
                    screenShareState: isScreenSharingRef.current,
                    activeSpeakerId: null,
                    chatScrollMessageId: null,
                    elapsedMs: Date.now() - (callStartTimeRef.current || Date.now()),
                });
            }, 2000);
            
            return () => {
                leaveMeeting(id);
                leaveCall();
                if (snapshotIntervalRef.current) {
                    clearInterval(snapshotIntervalRef.current);
                    snapshotIntervalRef.current = null;
                }
            };
        }
    }, [id, connected, hasJoined, joinMeeting, leaveMeeting, joinCall, leaveCall]);

    // Handle leaving the meeting
    const handleLeaveMeeting = () => {
        if (window.confirm('Are you sure you want to leave this meeting?')) {
            leaveCall();
            navigate('/dashboard');
        }
    };

    if (loading) {
        return (
            <div className="meeting-room-loading">
                <div className="spinner"></div>
                <p>Joining meeting room...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="meeting-room-error">
                <div className="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // Show join screen for non-participants
    if (!hasJoined && meeting) {
        return (
            <div className="meeting-room">
                <div className="meeting-room-header">
                    <div className="meeting-info">
                        <h1>{meeting?.title}</h1>
                        <div className="meeting-stats">
                            <span className="stat">
                                <Calendar size={16} />
                                {new Date(meeting.date).toLocaleDateString()}
                            </span>
                            <span className="stat">
                                <Clock size={16} />
                                {meeting.time}
                            </span>
                            <span className="stat">
                                <Timer size={16} />
                                {meeting.duration} minutes
                            </span>
                        </div>
                    </div>
                    <button 
                        className="action-btn" 
                        onClick={() => navigate('/dashboard')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                </div>

                <div className="join-meeting-screen">
                    <div className="join-meeting-card">
                        <div className="join-icon">🎥</div>
                        <h2>Join "{meeting.title}"</h2>
                        <p>Click the button below to join this meeting</p>
                        {meeting.description && (
                            <div className="meeting-description">
                                <p>{meeting.description}</p>
                            </div>
                        )}
                        <button 
                            className="btn-join-large"
                            onClick={handleJoinMeeting}
                            disabled={isJoining}
                        >
                            {isJoining ? 'Joining...' : '🚀 Join Meeting'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="meeting-room">
            {/* Header */}
            <div className="meeting-room-header">
                <div className="meeting-info">
                    <h1>{meeting?.title}</h1>
                    <div className="meeting-stats">
                        <span className="stat">
                            <Users size={16} />
                            {meeting?.participants?.length || 0} participants
                        </span>
                        <span className="stat">
                            <Users size={16} className="online-indicator" />
                            {onlineUsers.length} online
                        </span>
                        <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                            <span className="status-dot"></span>
                            {connected ? 'Connected' : 'Disconnected'}
                        </span>
                        {/* Biometric presence indicator */}
                        <BiometricEngine localStream={localStream} />
                    </div>
                </div>
                
                <div className="meeting-actions">
                    <button 
                        className={`action-btn ${showChat ? 'active' : ''}`}
                        onClick={() => setShowChat(!showChat)}
                        title={showChat ? 'Hide chat' : 'Show chat'}
                    >
                        <MessageSquare size={20} />
                    </button>
                    <button 
                        className={`action-btn ${showParticipants ? 'active' : ''}`}
                        onClick={() => setShowParticipants(!showParticipants)}
                        title={showParticipants ? 'Hide participants' : 'Show participants'}
                    >
                        <Users size={20} />
                    </button>
                    {/* Device handoff switcher */}
                    <DeviceHandoffManager
                        meetingId={id}
                        onStateRestored={(snapshot) => {
                            console.log('[MeetingRoom] State restored from snapshot:', snapshot);
                        }}
                    />
                    <button 
                        className="action-btn leave-btn" 
                        onClick={handleLeaveMeeting}
                    >
                        <PhoneOff size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="meeting-room-content">
                {/* Video Grid */}
                <div className={`video-section ${showChat ? 'with-chat' : 'full-width'} ${showParticipants ? 'with-participants' : ''}`}>
                    <CallInterface 
                        meetingId={id} 
                        onClose={() => {}} 
                    />
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="chat-sidebar">
                        <ChatRoom 
                            meetingId={id} 
                            isParticipant={hasJoined}
                        />
                    </div>
                )}

                {/* Participants Sidebar */}
                {showParticipants && (
                    <div className="participants-sidebar">
                        <div className="participants-header">
                            <h3>Participants ({meeting?.participants?.length || 0})</h3>
                        </div>
                        <div className="participants-list">
                            {meeting?.participants?.map(participant => (
                                <div key={participant.id} className="participant-item">
                                    <div className="participant-avatar">
                                        {participant.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="participant-info">
                                        <div className="participant-name">{participant.name}</div>
                                        <div className="participant-status">
                                            {onlineUsers.includes(participant.id) ? (
                                                <span className="status-online">● Online</span>
                                            ) : (
                                                <span className="status-offline">○ Offline</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Control Bar */}
            <div className="control-bar">
                <button 
                    className={`control-btn ${!inCall?.isAudioEnabled ? 'off' : ''}`}
                    onClick={toggleAudio}
                    title={inCall?.isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                    {inCall?.isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                    <span>{inCall?.isAudioEnabled ? 'Mute' : 'Unmuted'}</span>
                </button>
                <button 
                    className={`control-btn ${!inCall?.isVideoEnabled ? 'off' : ''}`}
                    onClick={toggleVideo}
                    title={inCall?.isVideoEnabled ? 'Stop Video' : 'Start Video'}
                >
                    {inCall?.isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                    <span>{inCall?.isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
                </button>
                <button 
                    className={`control-btn ${inCall?.isScreenSharing ? 'active' : ''}`}
                    onClick={shareScreen}
                    title={inCall?.isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                >
                    {inCall?.isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
                    <span>{inCall?.isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
                </button>
                <button 
                    className="control-btn end-call"
                    onClick={handleLeaveMeeting}
                    title="Leave Meeting"
                >
                    <PhoneOff size={24} />
                    <span>Leave</span>
                </button>
            </div>
        </div>
    );
};

export default MeetingRoom;