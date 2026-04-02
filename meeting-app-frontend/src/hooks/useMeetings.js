import { useState, useEffect, useCallback } from 'react';
import meetingsAPI from '../api/meetings';
import { useAuth } from './useAuth';

/**
 * Custom hook for meeting operations
 * 
 * This hook encapsulates all meeting-related state and operations.
 * It automatically fetches meetings when the user is authenticated.
 * 
 * Usage:
 * const {
 *   meetings,
 *   stats,
 *   loading,
 *   error,
 *   fetchMeetings,
 *   updateStatus,
 *   deleteMeeting,
 *   getCreatedMeetings,
 *   getInvitedMeetings,
 *   getUpcomingMeetings,
 *   getPendingInvitations
 * } = useMeetings();
 */
export const useMeetings = () => {
    const { user, isAuthenticated } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Fetch all meetings and stats for the current user
     */
    const fetchMeetings = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            setLoading(true);
            setError(null);
            
            // Fetch both meetings and stats in parallel
            const [meetingsRes, statsRes] = await Promise.all([
                meetingsAPI.getUserMeetings(),
                meetingsAPI.getDashboardStats()
            ]);
            
            setMeetings(meetingsRes.meetings || []);
            setStats(statsRes.stats || null);
        } catch (err) {
            setError(err.message || 'Failed to fetch meetings');
            console.error('Fetch meetings error:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Update participant status for a meeting (accept/decline)
     * @param {number} meetingId - The meeting ID
     * @param {string} status - 'accepted' or 'declined'
     * @returns {Promise<boolean>} - Success status
     */
    const updateStatus = async (meetingId, status) => {
        try {
            setError(null);
            await meetingsAPI.updateParticipantStatus(meetingId, status);
            
            // Update local state optimistically
            setMeetings(prev => prev.map(meeting => 
                meeting.id === meetingId 
                    ? { ...meeting, participant_status: status }
                    : meeting
            ));
            
            // Refresh stats
            const statsRes = await meetingsAPI.getDashboardStats();
            setStats(statsRes.stats);
            
            return true;
        } catch (err) {
            setError(err.message || 'Failed to update status');
            return false;
        }
    };

    /**
     * Delete a meeting (creator only)
     * @param {number} meetingId - The meeting ID
     * @returns {Promise<boolean>} - Success status
     */
    const deleteMeeting = async (meetingId) => {
        try {
            setError(null);
            await meetingsAPI.deleteMeeting(meetingId);
            
            // Remove from local state
            setMeetings(prev => prev.filter(m => m.id !== meetingId));
            
            // Refresh stats
            const statsRes = await meetingsAPI.getDashboardStats();
            setStats(statsRes.stats);
            
            return true;
        } catch (err) {
            setError(err.message || 'Failed to delete meeting');
            return false;
        }
    };

    /**
     * Get meetings created by the current user
     */
    const getCreatedMeetings = useCallback(() => {
        return meetings.filter(m => m.user_role === 'creator');
    }, [meetings]);

    /**
     * Get meetings where the current user is invited (not creator)
     */
    const getInvitedMeetings = useCallback(() => {
        return meetings.filter(m => m.user_role === 'participant');
    }, [meetings]);

    /**
     * Get upcoming meetings (future dates)
     */
    const getUpcomingMeetings = useCallback(() => {
        const now = new Date();
        return meetings.filter(m => {
            const meetingDate = new Date(`${m.date}T${m.time}`);
            return meetingDate > now;
        }).sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
    }, [meetings]);

    /**
     * Get past meetings
     */
    const getPastMeetings = useCallback(() => {
        const now = new Date();
        return meetings.filter(m => {
            const meetingDate = new Date(`${m.date}T${m.time}`);
            return meetingDate < now;
        }).sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateB - dateA; // Most recent first
        });
    }, [meetings]);

    /**
     * Get meetings for today
     */
    const getTodayMeetings = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        return meetings.filter(m => m.date === today);
    }, [meetings]);

    /**
     * Get pending invitations (where user is participant and status is pending)
     */
    const getPendingInvitations = useCallback(() => {
        return meetings.filter(m => 
            m.user_role === 'participant' && 
            m.participant_status === 'pending'
        );
    }, [meetings]);

    // Load meetings on mount when user is authenticated
    useEffect(() => {
        if (user) {
            fetchMeetings();
        }
    }, [user, fetchMeetings]);

    return {
        // State
        meetings,
        stats,
        loading,
        error,
        
        // Actions
        fetchMeetings,
        updateStatus,
        deleteMeeting,
        
        // Filtered lists
        getCreatedMeetings,
        getInvitedMeetings,
        getUpcomingMeetings,
        getPastMeetings,
        getTodayMeetings,
        getPendingInvitations
    };
};

// Also export a default for convenience
export default useMeetings;