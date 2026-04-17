import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for detecting audio levels and speaking state
 * @param {MediaStream} stream - Audio stream to monitor
 * @param {Object} options - Configuration options
 * @returns {Object} Audio level data
 */
export const useAudioLevel = (stream, options = {}) => {
    const {
        threshold = 30,        // Volume threshold for speaking detection
        smoothing = 0.8,       // Smoothing time constant
        fftSize = 1024,        // FFT size for frequency analysis
        updateInterval = 100   // Update interval in ms
    } = options;

    const [audioLevel, setAudioLevel] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isActive, setIsActive] = useState(false);

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const microphoneRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        if (!stream) {
            setIsActive(false);
            setAudioLevel(0);
            setIsSpeaking(false);
            return;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            setIsActive(false);
            return;
        }

        // Check if audio track is enabled
        const isEnabled = audioTracks[0].enabled;
        if (!isEnabled) {
            setIsActive(false);
            setAudioLevel(0);
            setIsSpeaking(false);
            return;
        }

        let audioContext;
        let analyser;
        let microphone;
        let dataArray;

        try {
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);

            // Configure analyser
            analyser.smoothingTimeConstant = smoothing;
            analyser.fftSize = fftSize;

            // Connect nodes
            microphone.connect(analyser);

            // Create data array
            dataArray = new Uint8Array(analyser.frequencyBinCount);

            // Store refs
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            microphoneRef.current = microphone;

            setIsActive(true);

            // Animation loop for continuous monitoring
            const updateAudioLevel = (timestamp) => {
                if (!analyserRef.current) return;

                // Throttle updates
                if (timestamp - lastUpdateRef.current < updateInterval) {
                    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
                    return;
                }

                lastUpdateRef.current = timestamp;

                // Get frequency data
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate average volume
                const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

                // Update state
                setAudioLevel(Math.round(average));
                setIsSpeaking(average > threshold);

                // Continue loop
                animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };

            // Start monitoring
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

        } catch (error) {
            console.error('Failed to initialize audio level detection:', error);
            setIsActive(false);
        }

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            if (microphoneRef.current) {
                try {
                    microphoneRef.current.disconnect();
                } catch (e) {
                    console.error('Error disconnecting microphone:', e);
                }
            }

            if (audioContextRef.current) {
                try {
                    audioContextRef.current.close();
                } catch (e) {
                    console.error('Error closing audio context:', e);
                }
            }

            audioContextRef.current = null;
            analyserRef.current = null;
            microphoneRef.current = null;
            animationFrameRef.current = null;

            setIsActive(false);
            setAudioLevel(0);
            setIsSpeaking(false);
        };
    }, [stream, threshold, smoothing, fftSize, updateInterval]);

    return {
        audioLevel,      // Current audio level (0-255)
        isSpeaking,      // Boolean indicating if speaking
        isActive,        // Boolean indicating if monitoring is active
        threshold        // Current threshold value
    };
};

export default useAudioLevel;
