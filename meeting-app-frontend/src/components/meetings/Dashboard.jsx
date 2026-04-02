import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '../../hooks/useMeetings';
import StatCard from './StatCard';
import MeetingCard from './MeetingCard';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    
    const {
        stats,
        meetings,
        loading,
        error,
        updateStatus,
        deleteMeeting,
        getCreatedMeetings,
        getInvitedMeetings,
        getUpcomingMeetings,
        getPendingInvitations
    } = useMeetings();

    const handleStatusUpdate = async (meetingId, status) => {
        const success = await updateStatus(meetingId, status);
        if (success) {
            // Show success message (you can add toast notification here)
            console.log(`Meeting ${status} successfully`);
        }
    };

    const handleDeleteMeeting = async (meetingId) => {
        const success = await deleteMeeting(meetingId);
        if (success) {
            console.log('Meeting deleted successfully');
        }
    };

    const getFilteredMeetings = () => {
        switch (activeTab) {
            case 'created':
                return getCreatedMeetings();
            case 'invited':
                return getInvitedMeetings();
            case 'upcoming':
                return getUpcomingMeetings();
            case 'pending':
                return getPendingInvitations();
            default:
                return meetings;
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <div className="error-icon">⚠️</div>
                <h3>Oops! Something went wrong</h3>
                <p>{error}</p>
                <button 
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    Try Again
                </button>
            </div>
        );
    }

    const filteredMeetings = getFilteredMeetings();

    return (
        <div className="dashboard">
            {/* Welcome Section */}
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back!</h1>
                    <p>Here's what's happening with your meetings</p>
                </div>
                <button 
                    className="btn btn-primary create-meeting-btn"
                    onClick={() => navigate('/create-meeting')}
                >
                    + Create New Meeting
                </button>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="stats-grid">
                    <StatCard
                        icon="📅"
                        title="Total Meetings"
                        value={stats.totalMeetings}
                        color="#667eea"
                        onClick={() => setActiveTab('all')}
                    />
                    <StatCard
                        icon="✍️"
                        title="Created by Me"
                        value={stats.createdByMe}
                        color="#4caf50"
                        onClick={() => setActiveTab('created')}
                    />
                    <StatCard
                        icon="📨"
                        title="Invited To"
                        value={stats.invitedTo}
                        color="#ff9800"
                        onClick={() => setActiveTab('invited')}
                    />
                    <StatCard
                        icon="⏳"
                        title="Upcoming"
                        value={stats.upcomingMeetings}
                        color="#2196f3"
                        onClick={() => setActiveTab('upcoming')}
                    />
                    <StatCard
                        icon="🤔"
                        title="Pending"
                        value={stats.pendingInvitations}
                        color="#f44336"
                        onClick={() => setActiveTab('pending')}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="dashboard-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Meetings ({meetings.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'created' ? 'active' : ''}`}
                    onClick={() => setActiveTab('created')}
                >
                    Created ({getCreatedMeetings().length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'invited' ? 'active' : ''}`}
                    onClick={() => setActiveTab('invited')}
                >
                    Invited ({getInvitedMeetings().length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upcoming')}
                >
                    Upcoming ({getUpcomingMeetings().length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending ({getPendingInvitations().length})
                </button>
            </div>

            {/* Meetings List */}
            <div className="meetings-list">
                {filteredMeetings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <h3>No meetings found</h3>
                        <p>
                            {activeTab === 'all' 
                                ? "You don't have any meetings yet. Create one to get started!"
                                : activeTab === 'pending' 
                                ? "You have no pending invitations"
                                : `No ${activeTab} meetings to show`}
                        </p>
                        {activeTab === 'all' && (
                            <button 
                                className="btn btn-primary"
                                onClick={() => navigate('/create-meeting')}
                            >
                                Create Your First Meeting
                            </button>
                        )}
                    </div>
                ) : (
                    filteredMeetings.map(meeting => (
                        <MeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            onStatusUpdate={handleStatusUpdate}
                            onDelete={handleDeleteMeeting}
                            isCreator={meeting.user_role === 'creator'}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default Dashboard;