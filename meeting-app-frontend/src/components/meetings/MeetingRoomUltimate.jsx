import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import meetingsAPI from '../../api/meetings';
import { 
    Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
    MessageSquare, PhoneOff, Link2, Check, Hand, Users,
    Wifi, WifiOff, Loader2, Volume2, AlertCircle, X
} from 'lucide-react';
import './MeetingRoomUltimate.css';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const safeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
};

const safeString = (value, fallback = '') => {
    return value != null && value !== undefined ? String(value) : fallback;
};

const getAvatarData = (email, profilePhoto = null) => {
    if (profilePhoto) {
        return { type: 'photo', value: profilePhoto };
    }
    
    if (!email) {
        return { type: 'initial', value: 'U', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
    }
    
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
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
};

const generateMeetingLink = (meetingId) => {
    return `${window.location.origin}/meeting/${meetingId}`;
};

// ============================================================================
// PARTICIPANT TILE COMPONENT
// ============================================================================
const ParticipantTile = ({ 
    participant,
    isLocal,
    size = 'normal',
    isPinned = false
}) => {
    const videoRef = useRef(null);
    const [videoReady, setVideoReady] = useState(false);

    useEffect(() => {
        if (videoRef.current && participant.stream && participant.cameraOn) {
            videoRef.current.srcObject = participant.stream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play().catch(console.error);
                setVideoReady(true);
            };
        } else {
            setVideoReady(false);
        }
    }, [participant.stream, participant.cameraOn]);

    const avatarData = getAvatarData(participant.email, participant.profilePhoto);
    const showVideo = videoReady && participant.cameraOn && participant.stream;

    return (
        <div 
            className={`participant-tile ${size} ${participant.speaking ? 'speaking' : ''} ${isPinned ? 'pinned' : ''} ${participant.disconnected ? 'disconnected' : ''}`}
            data-participant-id={participant.id}
        >
            {/* Video or Fallback */}
            <div className="tile-content">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="participant-video"
                    style={{ display: showVideo ? 'block' : 'none' }}
                />
                
                {!showVideo && (
                    <div className="participant-avatar" style={{ background: avatarData.color }}>
                        {avatarData.type === 'photo' ? (
                            <img src={avatarData.value} alt={participant.name} className="avatar-img" />
                        ) : (
                            <span className="avatar-initial">{avatarData.value}</span>
                        )}
                    </div>
                )}

                {/* Disconnected Overlay */}
                {participant.disconnected && (
                    <div className="disconnected-overlay">
                        <Loader2 className="spin" size={32} />
                        <span>Reconnecting...</span>
                    </div>
                )}
            </div>

            {/* Tile Info Bar */}
            <div className="tile-info">
                <div className="tile-name">
                    <span>{isLocal ? 'You' : participant.name}</span>
                    {!participant.cameraOn && <span className="status-badge">Camera Off</span>}
                </div>
                
                <div className="tile-indicators">
                    {participant.handRaised && (
                        <div className="indicator hand-raised" title="Hand raised">
                            <Hand size={16} />
                        </div>
                    )}
                    {participant.speaking && participant.micOn && (
                        <div className="indicator speaking-icon">
                            <Volume2 size={16} />
                        </div>
                    )}
                    {!participant.micOn && (
                        <div className="indicator muted">
                            <MicOff size={16} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// PARTICIPANTS GRID COMPONENT
// ============================================================================
const ParticipantsGrid = ({ participants, localParticipant, pinnedId }) => {
    const allParticipants = useMemo(() => {
        const all = [localParticipant, ...participants].filter(Boolean);
        
        // Sort: pinned first, then speaking, then others
        return all.sort((a, b) => {
            if (a.id === pinnedId) return -1;
            if (b.id === pinnedId) return 1;
            if (a.speaking && !b.speaking) return -1;
            if (!a.speaking && b.speaking) return 1;
            return 0;
        });
    }, [participants, localParticipant, pinnedId]);

    const gridClass = useMemo(() => {
        const count = allParticipants.length;
        if (count === 1) return 'grid-1';
        if (count === 2) return 'grid-2';
        if (count <= 4) return 'grid-4';
        if (count <= 6) return 'grid-6';
        if (count <= 9) return 'grid-9';
        return 'grid-many';
    }, [allParticipants.length]);

    if (allParticipants.length === 0) {
        return (
            <div className="empty-state">
                <Video size={64} />
                <h3>Waiting for participants...</h3>
                <p>Share the meeting link to invite others</p>
            </div>
        );
    }

    return (
        <div className={`participants-grid ${gridClass}`}>
            {allParticipants.map((p) => (
                <ParticipantTile
                    key={p.id}
                    participant={p}
                    isLocal={p.id === localParticipant?.id}
                    isPinned={p.id === pinnedId}
                />
            ))}
        </div>
    );
};

// ============================================================================
// RIGHT PANEL COMPONENT
// ============================================================================
const RightPanel = ({ isOpen, onClose, participants, localParticipant }) => {
    const [activeTab, setActiveTab] = useState('participants');

    const allParticipants = [localParticipant, ...participants].filter(Boolean);
    const raisedHands = allParticipants.filter(p => p.handRaised);
    const speaking = allParticipants.find(p => p.speaking);

    if (!isOpen) return null;

    return (
        <div className="right-panel">
            <div className="panel-header">
                <div className="panel-tabs">
                    <button 
                        className={activeTab === 'participants' ? 'active' : ''}
                        onClick={() => setActiveTab('participants')}
                    >
                        <Users size={18} />
                        Participants ({allParticipants.length})
                    </button>
                </div>
                <button className="panel-close" onClick={onClose} aria-label="Close panel">
                    <X size={20} />
                </button>
            </div>

            <div className="panel-content">
                {activeTab === 'participants' && (
                    <div className="participants-list">
                        {raisedHands.length > 0 && (
                            <div className="raised-hands-section">
                                <h4>Raised Hands ({raisedHands.length})</h4>
                                {raisedHands.map(p => (
                                    <div key={p.id} className="participant-item raised">
                                        <div className="participant-avatar-small" style={{ background: getAvatarData(p.email).color }}>
                                            {getAvatarData(p.email).value}
                                        </div>
                                        <span className="participant-name">{p.name}</span>
                                        <Hand size={16} className="hand-icon" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {speaking && (
                            <div className="current-speaker-section">
                                <h4>Currently Speaking</h4>
                                <div className="participant-item speaking">
                                    <div className="participant-avatar-small" style={{ background: getAvatarData(speaking.email).color }}>
                                        {getAvatarData(speaking.email).value}
                                    </div>
                                    <span className="participant-name">{speaking.name}</span>
                                    <Volume2 size={16} className="speaking-icon" />
                                </div>
                            </div>
                        )}

                        <div className="all-participants-section">
                            <h4>All Participants</h4>
                            {allParticipants.map(p => (
                                <div key={p.id} className="participant-item">
                                    <div className="participant-avatar-small" style={{ background: getAvatarData(p.email).color }}>
                                        {getAvatarData(p.email).value}
                                    </div>
                                    <span className="participant-name">
                                        {p.id === localParticipant?.id ? 'You' : p.name}
                                    </span>
                                    <div className="participant-status">
                                        {!p.micOn && <MicOff size={14} />}
                                        {!p.cameraOn && <VideoOff size={14} />}
                                        {p.disconnected && <WifiOff size={14} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// CONTROL BAR COMPONENT
// ============================================================================
const ControlBar = ({ 
    micOn, 
    cameraOn, 
    screenSharing,
    handRaised,
    onToggleMic,
    onToggleCamera,
    onToggleScreen,
    onToggleHand,
    onTogglePanel,
    onCopyLink,
    onLeave,
    linkCopied
}) => {
    return (
        <div className="control-bar">
            <div className="control-group">
                <button 
                    className={`control-btn ${!micOn ? 'off' : ''}`}
                    onClick={onToggleMic}
                    aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                    {micOn ? <Mic size={22} /> : <MicOff size={22} />}
                </button>

                <button 
                    className={`control-btn ${!cameraOn ? 'off' : ''}`}
                    onClick={onToggleCamera}
                    aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                >
                    {cameraOn ? <Video size={22} /> : <VideoOff size={22} />}
                </button>

                <button 
                    className={`control-btn ${screenSharing ? 'active' : ''}`}
                    onClick={onToggleScreen}
                    aria-label={screenSharing ? 'Stop sharing' : 'Share screen'}
                >
                    {screenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
                </button>

                <button 
                    className={`control-btn ${handRaised ? 'active' : ''}`}
                    onClick={onToggleHand}
                    aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
                    title={handRaised ? 'Lower hand' : 'Raise hand'}
                >
                    <Hand size={22} />
                </button>

                <button 
                    className="control-btn"
                    onClick={onTogglePanel}
                    aria-label="Toggle participants panel"
                >
                    <Users size={22} />
                </button>

                <button 
                    className={`control-btn ${linkCopied ? 'success' : ''}`}
                    onClick={onCopyLink}
                    aria-label="Copy meeting link"
                >
                    {linkCopied ? <Check size={22} /> : <Link2 size={22} />}
                </button>

                <button 
                    className="control-btn leave"
                    onClick={onLeave}
                    aria-label="Leave meeting"
                >
                    <PhoneOff size={22} />
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN MEETING ROOM COMPONENT
// ============================================================================
const MeetingRoomUltimate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { connected, socket } = useSocket();
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
        error
    } = useWebRTC();

    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [handRaised, setHandRaised] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [pinnedId, setPinnedId] = useState(null);

    // Fetch meeting
    useEffect(() => {
        const fetchMeeting = async () => {
            if (!id) return;
            try {
                const response = await meetingsAPI.getMeeting(id);
                setMeeting(response.meeting);
            } catch (err) {
                console.error('Failed to load meeting:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeeting();
    }, [id]);

    // Join call
    useEffect(() => {
        if (connected && !inCall && id && !isConnecting) {
            joinCall(id);
        }
    }, [connected, inCall, id, isConnecting, joinCall]);

    // Handle remote participants
    useEffect(() => {
        const remoteParticipants = Object.entries(remoteStreams || {}).map(([userId, data]) => ({
            id: userId,
            name: data.email || 'Participant',
            email: data.email,
            stream: data.stream,
            cameraOn: true,
            micOn: data.isAudioEnabled !== false,
            speaking: false,
            handRaised: false,
            disconnected: false,
            profilePhoto: null
        }));
        setParticipants(remoteParticipants);
    }, [remoteStreams]);

    const localParticipant = useMemo(() => {
        if (!localStream || !user) return null;
        return {
            id: 'local',
            name: user.email,
            email: user.email,
            stream: localStream,
            cameraOn: isVideoEnabled,
            micOn: isAudioEnabled,
            speaking: false,
            handRaised: handRaised,
            disconnected: false,
            profilePhoto: user.profilePhoto || null
        };
    }, [localStream, user, isVideoEnabled, isAudioEnabled, handRaised]);

    const handleToggleHand = useCallback(() => {
        setHandRaised(prev => !prev);
        if (socket) {
            socket.emit('hand-raised', { meetingId: id, raised: !handRaised });
        }
    }, [handRaised, socket, id]);

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(generateMeetingLink(id));
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    }, [id]);

    const handleLeave = useCallback(() => {
        if (window.confirm('Leave this meeting?')) {
            leaveCall();
            navigate('/dashboard');
        }
    }, [leaveCall, navigate]);

    if (loading) {
        return (
            <div className="meeting-room-ultimate">
                <div className="loading-state">
                    <Loader2 size={64} className="spin" />
                    <p>Loading meeting...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="meeting-room-ultimate">
                <div className="error-state">
                    <AlertCircle size={64} />
                    <h2>Camera/Microphone Access Required</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Refresh & Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="meeting-room-ultimate">
            {/* Connection Status */}
            <div className="connection-status">
                {connected ? (
                    <><Wifi size={16} /> Connected</>
                ) : (
                    <><WifiOff size={16} /> Disconnected</>
                )}
            </div>

            {/* Main Grid */}
            <div className={`meeting-main ${panelOpen ? 'panel-open' : ''}`}>
                <ParticipantsGrid 
                    participants={participants}
                    localParticipant={localParticipant}
                    pinnedId={pinnedId}
                />
            </div>

            {/* Right Panel */}
            <RightPanel 
                isOpen={panelOpen}
                onClose={() => setPanelOpen(false)}
                participants={participants}
                localParticipant={localParticipant}
            />

            {/* Control Bar */}
            <ControlBar 
                micOn={isAudioEnabled}
                cameraOn={isVideoEnabled}
                screenSharing={isScreenSharing}
                handRaised={handRaised}
                onToggleMic={toggleAudio}
                onToggleCamera={toggleVideo}
                onToggleScreen={shareScreen}
                onToggleHand={handleToggleHand}
                onTogglePanel={() => setPanelOpen(prev => !prev)}
                onCopyLink={handleCopyLink}
                onLeave={handleLeave}
                linkCopied={linkCopied}
            />
        </div>
    );
};

export default MeetingRoomUltimate;
