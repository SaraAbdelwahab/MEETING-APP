/**
 * Meeting Room Utility Functions
 * Production-ready helpers for the meeting room
 */

// ============================================================================
// SAFE VALUE HELPERS - Prevent NaN and undefined
// ============================================================================

export const safeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
};

export const safeString = (value, fallback = '') => {
    return value != null && value !== undefined ? String(value) : fallback;
};

export const safeArray = (value, fallback = []) => {
    return Array.isArray(value) ? value : fallback;
};

export const safeObject = (value, fallback = {}) => {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
};

// ============================================================================
// AVATAR GENERATION
// ============================================================================

const AVATAR_COLORS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
];

/**
 * Generate avatar data with fallback hierarchy:
 * 1. Profile photo (if provided)
 * 2. Email initial with gradient
 * 3. Generic fallback
 */
export const getAvatarData = (email, profilePhoto = null) => {
    // Priority 1: Profile photo
    if (profilePhoto && typeof profilePhoto === 'string' && profilePhoto.trim()) {
        return { 
            type: 'photo', 
            value: profilePhoto,
            color: null 
        };
    }
    
    // Priority 2: Email initial with gradient
    if (email && typeof email === 'string' && email.trim()) {
        const initial = email.charAt(0).toUpperCase();
        const color = getColorFromEmail(email);
        return { 
            type: 'initial', 
            value: initial,
            color 
        };
    }
    
    // Priority 3: Generic fallback
    return { 
        type: 'initial', 
        value: 'U',
        color: '#60c5ff' 
    };
};

/**
 * Generate consistent color from email using hash
 */
export const getColorFromEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return AVATAR_COLORS[0];
    }
    
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ============================================================================
// LOCAL STORAGE PREFERENCES
// ============================================================================

const PREFS_KEY = 'meeting_preferences';
const DEFAULT_PREFS = {
    audioEnabled: true,
    videoEnabled: true,
    chatOpen: false,
    lastMeetingId: null,
    displayName: null
};

/**
 * Save user preferences to localStorage
 */
export const savePreferences = (prefs) => {
    try {
        const existing = loadPreferences();
        const updated = { ...existing, ...prefs };
        localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
        return true;
    } catch (error) {
        console.error('Failed to save preferences:', error);
        return false;
    }
};

/**
 * Load user preferences from localStorage
 */
export const loadPreferences = () => {
    try {
        const stored = localStorage.getItem(PREFS_KEY);
        if (!stored) return { ...DEFAULT_PREFS };
        
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFS, ...parsed };
    } catch (error) {
        console.error('Failed to load preferences:', error);
        return { ...DEFAULT_PREFS };
    }
};

/**
 * Clear all preferences
 */
export const clearPreferences = () => {
    try {
        localStorage.removeItem(PREFS_KEY);
        return true;
    } catch (error) {
        console.error('Failed to clear preferences:', error);
        return false;
    }
};

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format timestamp for chat messages
 */
export const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        console.error('Failed to format time:', error);
        return '';
    }
};

/**
 * Format meeting duration
 */
export const formatDuration = (seconds) => {
    const safeSeconds = safeNumber(seconds, 0);
    
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = Math.floor(safeSeconds % 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
};

// ============================================================================
// NETWORK QUALITY DETECTION
// ============================================================================

/**
 * Analyze WebRTC stats to determine network quality
 * @param {RTCStatsReport} stats - WebRTC stats report
 * @returns {string} 'good' | 'poor' | 'bad'
 */
export const analyzeNetworkQuality = (stats) => {
    if (!stats) return 'good';
    
    let packetLoss = 0;
    let jitter = 0;
    let rtt = 0;
    
    stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.packetsLost && report.packetsReceived) {
                packetLoss = (report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100;
            }
            if (report.jitter) {
                jitter = report.jitter * 1000; // Convert to ms
            }
        }
        
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
                rtt = report.currentRoundTripTime * 1000; // Convert to ms
            }
        }
    });
    
    // Determine quality based on metrics
    if (packetLoss > 5 || jitter > 100 || rtt > 300) {
        return 'bad';
    } else if (packetLoss > 2 || jitter > 50 || rtt > 150) {
        return 'poor';
    }
    
    return 'good';
};

// ============================================================================
// AUDIO LEVEL DETECTION
// ============================================================================

/**
 * Detect if user is speaking based on audio level
 * @param {MediaStream} stream - Audio stream
 * @param {number} threshold - Volume threshold (0-255)
 * @returns {Promise<boolean>}
 */
export const detectSpeaking = async (stream, threshold = 30) => {
    if (!stream) return false;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        
        microphone.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Cleanup
        microphone.disconnect();
        audioContext.close();
        
        return average > threshold;
    } catch (error) {
        console.error('Failed to detect speaking:', error);
        return false;
    }
};

// ============================================================================
// MEETING LINK GENERATION
// ============================================================================

/**
 * Generate shareable meeting link
 */
export const generateMeetingLink = (meetingId) => {
    if (!meetingId) return '';
    return `${window.location.origin}/meeting/${meetingId}`;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
};

// ============================================================================
// DEVICE DETECTION
// ============================================================================

/**
 * Check if device has camera
 */
export const hasCamera = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('Failed to check for camera:', error);
        return false;
    }
};

/**
 * Check if device has microphone
 */
export const hasMicrophone = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'audioinput');
    } catch (error) {
        console.error('Failed to check for microphone:', error);
        return false;
    }
};

/**
 * Get list of available devices
 */
export const getAvailableDevices = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            cameras: devices.filter(d => d.kind === 'videoinput'),
            microphones: devices.filter(d => d.kind === 'audioinput'),
            speakers: devices.filter(d => d.kind === 'audiooutput')
        };
    } catch (error) {
        console.error('Failed to get devices:', error);
        return { cameras: [], microphones: [], speakers: [] };
    }
};

// ============================================================================
// BROWSER DETECTION
// ============================================================================

/**
 * Detect browser type and version
 */
export const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (ua.indexOf('Firefox') > -1) {
        browser = 'Firefox';
        version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Chrome') > -1) {
        browser = 'Chrome';
        version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Safari') > -1) {
        browser = 'Safari';
        version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Edge') > -1) {
        browser = 'Edge';
        version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }
    
    return { browser, version };
};

/**
 * Check if browser supports WebRTC
 */
export const supportsWebRTC = () => {
    return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        window.RTCPeerConnection
    );
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
    if (!error) return 'An unknown error occurred';
    
    const errorName = error.name || '';
    const errorMessage = error.message || '';
    
    // Permission errors
    if (errorName === 'NotAllowedError' || errorMessage.includes('denied')) {
        return 'Camera and microphone access denied. Please allow permissions in your browser settings.';
    }
    
    if (errorName === 'NotFoundError') {
        return 'No camera or microphone found. Please connect a device and try again.';
    }
    
    if (errorName === 'NotReadableError') {
        return 'Camera or microphone is already in use by another application.';
    }
    
    if (errorName === 'SecurityError') {
        return 'Camera access blocked by browser security settings.';
    }
    
    if (errorName === 'AbortError') {
        return 'Permission request was cancelled. Please try again.';
    }
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        return 'Network connection error. Please check your internet connection.';
    }
    
    // Generic fallback
    return `Error: ${errorMessage || 'Something went wrong'}`;
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate meeting ID format
 */
export const isValidMeetingId = (id) => {
    if (!id) return false;
    // Assuming numeric IDs or UUIDs
    return /^[0-9a-f-]+$/i.test(String(id));
};

/**
 * Sanitize display name
 */
export const sanitizeDisplayName = (name) => {
    if (!name || typeof name !== 'string') return 'Anonymous';
    return name.trim().slice(0, 50); // Max 50 characters
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    safeNumber,
    safeString,
    safeArray,
    safeObject,
    getAvatarData,
    getColorFromEmail,
    savePreferences,
    loadPreferences,
    clearPreferences,
    formatMessageTime,
    formatDuration,
    analyzeNetworkQuality,
    detectSpeaking,
    generateMeetingLink,
    copyToClipboard,
    hasCamera,
    hasMicrophone,
    getAvailableDevices,
    getBrowserInfo,
    supportsWebRTC,
    getErrorMessage,
    isValidEmail,
    isValidMeetingId,
    sanitizeDisplayName
};
