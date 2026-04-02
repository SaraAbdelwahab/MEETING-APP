/**
 * Date formatting utilities
 */

/**
 * Format date to readable string
 * @param {string} dateString - YYYY-MM-DD
 * @returns {string} - e.g., "January 15, 2024"
 */
export const formatDate = (dateString) => {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

/**
 * Format time to readable string
 * @param {string} timeString - HH:MM:SS
 * @returns {string} - e.g., "2:30 PM"
 */
export const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

/**
 * Get relative time (e.g., "in 2 hours", "yesterday")
 * @param {string} dateString
 * @param {string} timeString
 * @returns {string}
 */
export const getRelativeTime = (dateString, timeString) => {
    const meetingDate = new Date(`${dateString}T${timeString}`);
    const now = new Date();
    const diffMs = meetingDate - now;
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 0) {
        return 'Past';
    } else if (diffMins < 60) {
        return `In ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
    } else if (diffHours < 24) {
        return `In ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    } else if (diffDays === 1) {
        return 'Tomorrow';
    } else if (diffDays < 7) {
        return `In ${diffDays} days`;
    } else {
        return formatDate(dateString);
    }
};

/**
 * Check if meeting is today
 * @param {string} dateString
 * @returns {boolean}
 */
export const isToday = (dateString) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
};

/**
 * Check if meeting is upcoming (future)
 * @param {string} dateString
 * @param {string} timeString
 * @returns {boolean}
 */
export const isUpcoming = (dateString, timeString) => {
    const meetingDate = new Date(`${dateString}T${timeString}`);
    const now = new Date();
    return meetingDate > now;
};