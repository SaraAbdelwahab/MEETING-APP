import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useMeetings } from '../../hooks/useMeetings';
import meetingsAPI from '../../api/meetings';
import ParticipantsList from './ParticipantsList';
import ChatRoom from '../chat/ChatRoom';
import { useWebRTC } from '../../context/WebRTCContext';
import CallInterface from '../video/CallInterface';
import { formatDate, formatTime, isUpcoming } from '../../utils/formatDate';
import './MeetingDetails.css';

const MeetingDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { connected } = useSocket();
    const { updateStatus, deleteMeeting } = useMeetings();
    const { inCall } = useWebRTC();

    const [meeting, setMeeting] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'chat'
    const [showCall, setShowCall] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // Fetch meeting details
    useEffect(() => {
        fetchMeetingDetails();
    }, [id]);

    const fetchMeetingDetails = async () => {
        try {
            setLoading(true);
            const response = await meetingsAPI.getMeeting(id);
            setMeeting(response.meeting);
            setParticipants(response.meeting.participants || []);
            
            // Initialize edit form with current values
            setEditForm({
                title: response.meeting.title,
                description: response.meeting.description || '',
                date: response.meeting.date,
                time: response.meeting.time,
                duration: response.meeting.duration
            });
        } catch (err) {
            setError(err.message || 'Failed to load meeting details');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (status) => {
        const success = await updateStatus(id, status);
        if (success) {
            setSuccessMessage(`Meeting ${status} successfully`);
            fetchMeetingDetails(); // Refresh data
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this meeting?')) {
            const success = await deleteMeeting(id);
            if (success) {
                navigate('/dashboard', {
                    state: { message: 'Meeting deleted successfully' }
                });
            }
        }
    };

    const handleRemoveParticipant = async (participantId) => {
        if (window.confirm('Remove this participant from the meeting?')) {
            try {
                await meetingsAPI.removeParticipant(id, participantId);
                setSuccessMessage('Participant removed successfully');
                fetchMeetingDetails(); // Refresh data
            } catch (err) {
                setError(err.message || 'Failed to remove participant');
            }
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await meetingsAPI.updateMeeting(id, editForm);
            setSuccessMessage('Meeting updated successfully');
            setIsEditing(false);
            fetchMeetingDetails(); // Refresh data
        } catch (err) {
            setError(err.message || 'Failed to update meeting');
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleJoinMeeting = async () => {
        try {
            setIsJoining(true);
            await meetingsAPI.joinMeeting(id);
            setSuccessMessage('Successfully joined the meeting!');
            fetchMeetingDetails(); // Refresh to show updated participant status
        } catch (err) {
            setError(err.message || 'Failed to join meeting');
        } finally {
            setIsJoining(false);
        }
    };

    const isCreator = meeting?.created_by === user?.id;
    const userParticipant = participants.find(p => p.id === user?.id);
    const userStatus = userParticipant?.status;
    const isParticipant = isCreator || !!userParticipant;

    if (loading) {
        return (
            <div className="meeting-details-loading">
                <div className="spinner"></div>
                <p>Loading meeting details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="meeting-details-error">
                <div className="error-icon">⚠️</div>
                <h3>Error Loading Meeting</h3>
                <p>{error}</p>
                <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/dashboard')}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className="meeting-not-found">
                <div className="not-found-icon">🔍</div>
                <h3>Meeting Not Found</h3>
                <p>The meeting you're looking for doesn't exist or you don't have access.</p>
                <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/dashboard')}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="meeting-details-container">
            {successMessage && (
                <div className="alert alert-success">
                    <span>✅ {successMessage}</span>
                    <button 
                        className="alert-close"
                        onClick={() => setSuccessMessage('')}
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="meeting-details-card">
                <div className="meeting-details-header">
                    <button 
                        className="back-button"
                        onClick={() => navigate('/dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                    
                    <div className="header-actions">

                        {isParticipant && (
                          <button
                         className={`btn btn-call ${inCall ? 'in-call' : ''}`}
                          onClick={() => setShowCall(!showCall)}
                          title={inCall ? 'Show call interface' : 'Start video call'}
                         >
                          {inCall ? '📹 In Call' : '📞 Start Call'}
                           </button>
                             )}

                        {isCreator && !isEditing && (
                            <>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => setIsEditing(true)}
                                >
                                    ✏️ Edit
                                </button>
                                <button 
                                    className="btn btn-danger"
                                    onClick={handleDelete}
                                >
                                    🗑️ Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Connection Status Banner */}
                {isParticipant && !connected && (
                    <div className="connection-banner warning">
                        <span className="banner-icon">🔌</span>
                        <span>Connecting to chat server...</span>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="details-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        📋 Details
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        💬 Chat
                        {activeTab !== 'chat' && (
                            <span className="tab-badge">New</span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'details' ? (
                    // Details Tab
                    <>
                        {!isEditing ? (
                            // View Mode
                            <>
                                <div className="meeting-title-section">
                                    <h1>{meeting.title}</h1>
                                    <div className="meeting-badges">
                                        {isCreator && (
                                            <span className="badge badge-creator">Creator</span>
                                        )}
                                        {!isCreator && userStatus && (
                                            <span className={`badge badge-${userStatus}`}>
                                                {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
                                            </span>
                                        )}
                                        {!isUpcoming(meeting.date, meeting.time) && (
                                            <span className="badge badge-past">Past</span>
                                        )}
                                    </div>
                                </div>

                                <div className="meeting-info-grid">
                                    <div className="info-item">
                                        <span className="info-label">📅 Date</span>
                                        <span className="info-value">{formatDate(meeting.date)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">⏰ Time</span>
                                        <span className="info-value">{formatTime(meeting.time)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">⏱️ Duration</span>
                                        <span className="info-value">{meeting.duration} minutes</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">👤 Created by</span>
                                        <span className="info-value">{meeting.creator_name}</span>
                                    </div>
                                </div>

                                {meeting.description && (
                                    <div className="meeting-description-section">
                                        <h3>Description</h3>
                                        <p className="description-text">{meeting.description}</p>
                                    </div>
                                )}

                                {!isCreator && userStatus === 'pending' && isUpcoming(meeting.date, meeting.time) && (
                                    <div className="invitation-actions">
                                        <p className="invitation-text">You've been invited to this meeting</p>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn btn-success"
                                                onClick={() => handleStatusUpdate('accepted')}
                                            >
                                                ✓ Accept
                                            </button>
                                            <button 
                                                className="btn btn-danger"
                                                onClick={() => handleStatusUpdate('declined')}
                                            >
                                                ✗ Decline
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Join Meeting Button for non-participants */}
                                {!isParticipant && isUpcoming(meeting.date, meeting.time) && (
                                    <div className="join-meeting-section">
                                        <p className="join-text">You're not a participant yet. Join this meeting to participate in chat and video calls.</p>
                                        <button 
                                            className="btn btn-primary btn-join"
                                            onClick={handleJoinMeeting}
                                            disabled={isJoining}
                                        >
                                            {isJoining ? 'Joining...' : '✓ Join Meeting'}
                                        </button>
                                    </div>
                                )}


                                {/* Call Interface Modal */}
                                {showCall && (
                                 <div className="call-modal">
                                 <div className="call-modal-content">
                                   <button 
                                   className="close-call"
                                   onClick={() => setShowCall(false)}
                                     >
                                       ×
                                 </button>
                              <CallInterface 
                                meetingId={id}
                                onClose={() => setShowCall(false)}
                               />
                              </div>
                          </div>
                           )}


                            </>
                        ) : (
                            // Edit Mode
                            <form onSubmit={handleEditSubmit} className="edit-meeting-form">
                                <h2>Edit Meeting</h2>
                                
                                <div className="form-group">
                                    <label htmlFor="title">Title</label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={editForm.title}
                                        onChange={handleEditChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={editForm.description}
                                        onChange={handleEditChange}
                                        rows="3"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="date">Date</label>
                                        <input
                                            type="date"
                                            id="date"
                                            name="date"
                                            value={editForm.date}
                                            onChange={handleEditChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="time">Time</label>
                                        <input
                                            type="time"
                                            id="time"
                                            name="time"
                                            value={editForm.time}
                                            onChange={handleEditChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="duration">Duration (minutes)</label>
                                        <select
                                            id="duration"
                                            name="duration"
                                            value={editForm.duration}
                                            onChange={handleEditChange}
                                            required
                                        >
                                            <option value="15">15 minutes</option>
                                            <option value="30">30 minutes</option>
                                            <option value="45">45 minutes</option>
                                            <option value="60">1 hour</option>
                                            <option value="90">1.5 hours</option>
                                            <option value="120">2 hours</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="edit-actions">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Participants Section */}
                        <div className="participants-section">
                            <ParticipantsList
                                participants={participants}
                                isCreator={isCreator}
                                onRemoveParticipant={handleRemoveParticipant}
                            />
                        </div>
                    </>
                ) : (
                    // Chat Tab
                    <div className="chat-section">
                        <ChatRoom 
                            meetingId={id}
                            isParticipant={isParticipant}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingDetails;