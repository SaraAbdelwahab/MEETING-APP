import axiosInstance from './axios';

/**
 * Meetings API service
 * Handles all meeting-related API calls
 */
const meetingsAPI = {
    /**
     * Get dashboard statistics
     * @returns {Promise} - { stats, upcomingMeetings, pendingInvitations }
     */
    getDashboardStats: async () => {
        try {
            const response = await axiosInstance.get('/meetings/stats');
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to fetch dashboard stats',
                status: error.status
            };
        }
    },

    /**
     * Get all user meetings
     * @returns {Promise} - { meetings }
     */
    getUserMeetings: async () => {
        try {
            const response = await axiosInstance.get('/meetings');
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to fetch meetings',
                status: error.status
            };
        }
    },

    /**
     * Get single meeting details
     * @param {number} meetingId
     * @returns {Promise} - { meeting }
     */
    getMeeting: async (meetingId) => {
        try {
            const response = await axiosInstance.get(`/meetings/${meetingId}`);
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to fetch meeting',
                status: error.status
            };
        }
    },

    /**
     * Create a new meeting
     * @param {Object} meetingData - { title, description, date, time, duration, invitees }
     * @returns {Promise} - { message, meeting }
     */
    createMeeting: async (meetingData) => {
        try {
            const response = await axiosInstance.post('/meetings', meetingData);
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to create meeting',
                status: error.status
            };
        }
    },

    /**
     * Update meeting status (accept/decline)
     * @param {number} meetingId
     * @param {string} status - 'accepted' or 'declined'
     * @returns {Promise}
     */
    updateParticipantStatus: async (meetingId, status) => {
        try {
            const response = await axiosInstance.put(`/meetings/${meetingId}/status`, { status });
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to update status',
                status: error.status
            };
        }
    },

    /**
     * Delete a meeting (creator only)
     * @param {number} meetingId
     * @returns {Promise}
     */
    deleteMeeting: async (meetingId) => {
        try {
            const response = await axiosInstance.delete(`/meetings/${meetingId}`);
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to delete meeting',
                status: error.status
            };
        }
    },

    /**
     * Update meeting (creator only)
     * @param {number} meetingId
     * @param {Object} meetingData
     * @returns {Promise}
     */
    updateMeeting: async (meetingId, meetingData) => {
        try {
            const response = await axiosInstance.put(`/meetings/${meetingId}`, meetingData);
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to update meeting',
                status: error.status
            };
        }
    },

    /**
     * Search meetings
     * @param {Object} params - Search parameters
     * @returns {Promise}
     */
    searchMeetings: async (params) => {
        try {
            const response = await axiosInstance.get('/meetings/search', { params });
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to search meetings',
                status: error.status
            };
        }
    },

    /**
     * Join meeting via link
     * @param {number} meetingId
     * @returns {Promise}
     */
    joinMeeting: async (meetingId) => {
        try {
            const response = await axiosInstance.post(`/meetings/${meetingId}/join`);
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to join meeting',
                status: error.status
            };
        }
    },

    /**
     * Get meetings by date
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise}
     */
    getMeetingsByDate: async (date) => {
        try {
            const response = await axiosInstance.get(`/meetings/date/${date}`);
            return response.data;
        } catch (error) {
            throw {
                message: error.message || 'Failed to fetch meetings for date',
                status: error.status
            };
        }
    }
};

export default meetingsAPI;