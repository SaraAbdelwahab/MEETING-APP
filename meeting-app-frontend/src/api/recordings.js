import axiosInstance from './axios';

/**
 * Get chunk hashes for a recording
 * @param {string} recordingId - The recording ID
 * @returns {Promise<Array>} Array of chunk hashes with Merkle proofs
 */
export const getRecordingChunks = async (recordingId) => {
    const response = await axiosInstance.get(`/recordings/${recordingId}/chunks`);
    return response.data.chunks;
};

/**
 * Export a recording with C2PA manifest
 * @param {string} recordingId - The recording ID
 * @returns {Promise<Blob>} Recording file with C2PA manifest
 */
export const exportRecording = async (recordingId) => {
    const response = await axiosInstance.get(`/recordings/${recordingId}/export`, {
        responseType: 'blob',
    });
    return response.data;
};

/**
 * Get list of recordings for a meeting
 * @param {number} meetingId - The meeting ID
 * @returns {Promise<Array>} Array of recordings
 */
export const getMeetingRecordings = async (meetingId) => {
    const response = await axiosInstance.get(`/meetings/${meetingId}/recordings`);
    return response.data.recordings;
};

/**
 * Get all recordings for the current user
 * @returns {Promise<Object>} Object with recordings array
 */
export const getUserRecordings = async () => {
    try {
        const response = await axiosInstance.get('/recordings');
        return response.data;
    } catch (error) {
        throw {
            message: error.message || 'Failed to fetch recordings',
            status: error.status
        };
    }
};

/**
 * Download a recording
 * @param {string} recordingId - The recording ID
 * @returns {Promise<Blob>} Recording file blob
 */
export const downloadRecording = async (recordingId) => {
    try {
        const response = await axiosInstance.get(`/recordings/${recordingId}/download`, {
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        throw {
            message: error.message || 'Failed to download recording',
            status: error.status
        };
    }
};

/**
 * Delete a recording
 * @param {string} recordingId - The recording ID
 * @returns {Promise<Object>} Success message
 */
export const deleteRecording = async (recordingId) => {
    try {
        const response = await axiosInstance.delete(`/recordings/${recordingId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.message || 'Failed to delete recording',
            status: error.status
        };
    }
};

const recordingsAPI = {
    getRecordingChunks,
    exportRecording,
    getMeetingRecordings,
    getUserRecordings,
    downloadRecording,
    deleteRecording
};

export default recordingsAPI;
