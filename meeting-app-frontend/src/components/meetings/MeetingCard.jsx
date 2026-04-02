import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime, getRelativeTime, isToday } from '../../utils/formatDate';
import './MeetingCard.css';

const MeetingCard = ({ 
    meeting, 
    onStatusUpdate, 
    onDelete,
    isCreator 
}) => {
    const navigate = useNavigate();
    const [showActions, setShowActions] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleViewDetails = () => {
        navigate(`/meetings/${meeting.id}`);
    };

    const handleStatusChange = async (status) => {
        setIsUpdating(true);
        await onStatusUpdate(meeting.id, status);
        setIsUpdating(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this meeting?')) {
            await onDelete(meeting.id);
        }
    };

    const getStatusBadge = () => {
        if (meeting.user_role === 'creator') {
            return <span className="badge badge-creator">Creator</span>;
        }
        
        switch (meeting.participant_status) {
            case 'accepted':
                return <span className="badge badge-accepted">Accepted</span>;
            case 'declined':
                return <span className="badge badge-declined">Declined</span>;
            default:
                return <span className="badge badge-pending">Pending</span>;
        }
    };

    const isPast = () => {
        const meetingDate = new Date(`${meeting.date}T${meeting.time}`);
        return meetingDate < new Date();
    };

    return (
        <div 
            className={`meeting-card ${isPast() ? 'past-meeting' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="meeting-time">
                <div className="date-badge">
                    <span className="month">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="day">{new Date(meeting.date).getDate()}</span>
                </div>
                <div className="time-info">
                    <span className="time">{formatTime(meeting.time)}</span>
                    <span className="duration">{meeting.duration} min</span>
                </div>
            </div>

            <div className="meeting-content" onClick={handleViewDetails}>
                <div className="meeting-header">
                    <h3 className="meeting-title">{meeting.title}</h3>
                    {getStatusBadge()}
                </div>

                {meeting.description && (
                    <p className="meeting-description">{meeting.description}</p>
                )}

                <div className="meeting-meta">
                    <div className="meta-item">
                        <span className="meta-icon"></span>
                        <span>Created by {meeting.creator_name}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-icon">⏰</span>
                        <span>{getRelativeTime(meeting.date, meeting.time)}</span>
                    </div>
                    {isToday(meeting.date) && (
                        <span className="today-tag">Today</span>
                    )}
                </div>
            </div>

            {showActions && !isPast() && (
                <div className="meeting-actions">
                    {meeting.user_role === 'participant' && meeting.participant_status === 'pending' && (
                        <>
                            <button
                                className="action-btn accept-btn"
                                onClick={() => handleStatusChange('accepted')}
                                disabled={isUpdating}
                            >
                                ✓ Accept
                            </button>
                            <button
                                className="action-btn decline-btn"
                                onClick={() => handleStatusChange('declined')}
                                disabled={isUpdating}
                            >
                                ✗ Decline
                            </button>
                        </>
                    )}
                    
                    {isCreator && (
                        <button
                            className="action-btn delete-btn"
                            onClick={handleDelete}
                            disabled={isUpdating}
                        >
                            🗑️ Delete
                        </button>
                    )}
                    
                    <button
                        className="action-btn view-btn"
                        onClick={handleViewDetails}
                    >
                        👁️ View
                    </button>
                </div>
            )}
        </div>
    );
};

export default MeetingCard;