// src/components/meetings/MeetingRoom.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // ← React Router hooks
import { useAuth } from '../../hooks/useAuth'; // ← Custom auth hook
import { useSocket } from '../../hooks/useSocket'; // ← Custom socket hook
import { useWebRTC } from '../../hooks/useWebRTC'; // ← Custom WebRTC hook
import meetingsAPI from '../../api/meetings';
import CallInterface from '../video/CallInterface';
import ChatRoom from '../chat/ChatRoom';
import './MeetingRoom.css';

const MeetingRoom = () => {
    // 1. Get meeting ID from URL using useParams()
    const { id } = useParams();
    
    // 2. Get navigation function using useNavigate()
    const navigate = useNavigate();
    
    // 3. Get authentication data using useAuth()
    const { user, isAuthenticated } = useAuth();
    
    // 4. Get socket connection using useSocket()
    const { connected, onlineUsers, joinMeeting, leaveMeeting } = useSocket();
    
    // 5. Get WebRTC functionality using useWebRTC()
    const { 
        localStream, 
        remoteStreams, 
        inCall, 
        joinCall, 
        leaveCall,
        toggleAudio,
        toggleVideo,
        shareScreen
    } = useWebRTC();

    // Local state
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showChat, setShowChat] = useState(true);
    const [showParticipants, setShowParticipants] = useState(true);

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
                
                if (!isParticipant) {
                    setError('You are not a participant in this meeting');
                    setTimeout(() => navigate('/dashboard'), 3000);
                }
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

    // Join Socket.IO room when component mounts
    useEffect(() => {
        if (id && connected) {
            joinMeeting(id);
            
            // Auto-join video call when entering meeting room
            joinCall(id);
            
            return () => {
                leaveMeeting(id);
                leaveCall();
            };
        }
    }, [id, connected, joinMeeting, leaveMeeting, joinCall, leaveCall]);

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

    return (
        <div className="meeting-room">
            {/* Header */}
            <div className="meeting-room-header">
                <div className="meeting-info">
                    <h1>{meeting?.title}</h1>
                    <div className="meeting-stats">
                        <span className="stat">
                            👥 {meeting?.participants?.length || 0} participants
                        </span>
                        <span className="stat">
                            🟢 {onlineUsers.length} online
                        </span>
                        <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                            {connected ? '● Connected' : '○ Disconnected'}
                        </span>
                    </div>
                </div>
                
                <div className="meeting-actions">
                    <button 
                        className="action-btn" 
                        onClick={() => setShowChat(!showChat)}
                        title={showChat ? 'Hide chat' : 'Show chat'}
                    >
                        💬
                    </button>
                    <button 
                        className="action-btn" 
                        onClick={() => setShowParticipants(!showParticipants)}
                        title={showParticipants ? 'Hide participants' : 'Show participants'}
                    >
                        👥
                    </button>
                    <button 
                        className="action-btn leave-btn" 
                        onClick={handleLeaveMeeting}
                    >
                        📞 Leave
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
                            isParticipant={true}
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
                >
                    {inCall?.isAudioEnabled ? '🎤' : '🎤❌'}
                    <span>Mute</span>
                </button>
                <button 
                    className={`control-btn ${!inCall?.isVideoEnabled ? 'off' : ''}`}
                    onClick={toggleVideo}
                >
                    {inCall?.isVideoEnabled ? '📹' : '📹❌'}
                    <span>Video</span>
                </button>
                <button 
                    className={`control-btn ${inCall?.isScreenSharing ? 'active' : ''}`}
                    onClick={shareScreen}
                >
                    🖥️
                    <span>Share Screen</span>
                </button>
                <button 
                    className="control-btn end-call"
                    onClick={handleLeaveMeeting}
                >
                    📞❌
                    <span>Leave</span>
                </button>
            </div>
        </div>
    );
};

export default MeetingRoom;