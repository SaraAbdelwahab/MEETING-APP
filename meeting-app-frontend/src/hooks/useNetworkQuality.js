import { useState, useEffect, useRef } from 'react';
import { analyzeNetworkQuality } from '../utils/meetingUtils';

/**
 * Custom hook for monitoring network quality via WebRTC stats
 * @param {RTCPeerConnection} peerConnection - WebRTC peer connection
 * @param {Object} options - Configuration options
 * @returns {Object} Network quality data
 */
export const useNetworkQuality = (peerConnection, options = {}) => {
    const {
        updateInterval = 5000,  // Update every 5 seconds
        enabled = true          // Enable/disable monitoring
    } = options;

    const [quality, setQuality] = useState('good'); // 'good' | 'poor' | 'bad'
    const [stats, setStats] = useState(null);
    const [metrics, setMetrics] = useState({
        packetLoss: 0,
        jitter: 0,
        rtt: 0,
        bandwidth: 0
    });

    const intervalRef = useRef(null);

    useEffect(() => {
        if (!peerConnection || !enabled) {
            setQuality('good');
            setStats(null);
            setMetrics({ packetLoss: 0, jitter: 0, rtt: 0, bandwidth: 0 });
            return;
        }

        const updateStats = async () => {
            try {
                const statsReport = await peerConnection.getStats();
                setStats(statsReport);

                // Analyze quality
                const networkQuality = analyzeNetworkQuality(statsReport);
                setQuality(networkQuality);

                // Extract detailed metrics
                const detailedMetrics = extractMetrics(statsReport);
                setMetrics(detailedMetrics);

            } catch (error) {
                console.error('Failed to get WebRTC stats:', error);
            }
        };

        // Initial update
        updateStats();

        // Set up interval
        intervalRef.current = setInterval(updateStats, updateInterval);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [peerConnection, updateInterval, enabled]);

    return {
        quality,        // 'good' | 'poor' | 'bad'
        stats,          // Raw stats report
        metrics,        // Extracted metrics
        isMonitoring: !!intervalRef.current
    };
};

/**
 * Extract detailed metrics from stats report
 */
const extractMetrics = (statsReport) => {
    const metrics = {
        packetLoss: 0,
        jitter: 0,
        rtt: 0,
        bandwidth: 0
    };

    if (!statsReport) return metrics;

    statsReport.forEach(report => {
        // Inbound RTP stats (receiving)
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.packetsLost && report.packetsReceived) {
                const totalPackets = report.packetsLost + report.packetsReceived;
                metrics.packetLoss = (report.packetsLost / totalPackets) * 100;
            }
            if (report.jitter) {
                metrics.jitter = report.jitter * 1000; // Convert to ms
            }
        }

        // Candidate pair stats (connection)
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
                metrics.rtt = report.currentRoundTripTime * 1000; // Convert to ms
            }
            if (report.availableOutgoingBitrate) {
                metrics.bandwidth = report.availableOutgoingBitrate / 1000000; // Convert to Mbps
            }
        }

        // Outbound RTP stats (sending)
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
            // Additional metrics can be extracted here
        }
    });

    return metrics;
};

export default useNetworkQuality;
