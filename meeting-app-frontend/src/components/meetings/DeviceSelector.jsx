import React, { useState, useEffect } from 'react';
import { Camera, Mic, Speaker, ChevronDown } from 'lucide-react';
import { getAvailableDevices } from '../../utils/meetingUtils';
import './DeviceSelector.css';

/**
 * Device Selector Component
 * Allows users to select camera, microphone, and speaker devices
 */
const DeviceSelector = ({ onDeviceChange, currentDevices = {} }) => {
    const [devices, setDevices] = useState({
        cameras: [],
        microphones: [],
        speakers: []
    });
    const [selectedDevices, setSelectedDevices] = useState({
        camera: currentDevices.camera || '',
        microphone: currentDevices.microphone || '',
        speaker: currentDevices.speaker || ''
    });
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load available devices
    useEffect(() => {
        const loadDevices = async () => {
            try {
                setLoading(true);
                const availableDevices = await getAvailableDevices();
                setDevices(availableDevices);

                // Set default selections if not already set
                if (!selectedDevices.camera && availableDevices.cameras.length > 0) {
                    setSelectedDevices(prev => ({
                        ...prev,
                        camera: availableDevices.cameras[0].deviceId
                    }));
                }
                if (!selectedDevices.microphone && availableDevices.microphones.length > 0) {
                    setSelectedDevices(prev => ({
                        ...prev,
                        microphone: availableDevices.microphones[0].deviceId
                    }));
                }
                if (!selectedDevices.speaker && availableDevices.speakers.length > 0) {
                    setSelectedDevices(prev => ({
                        ...prev,
                        speaker: availableDevices.speakers[0].deviceId
                    }));
                }
            } catch (error) {
                console.error('Failed to load devices:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDevices();

        // Listen for device changes
        const handleDeviceChange = () => {
            loadDevices();
        };

        navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

        return () => {
            navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
        };
    }, []);

    const handleDeviceSelect = (type, deviceId) => {
        setSelectedDevices(prev => ({
            ...prev,
            [type]: deviceId
        }));

        if (onDeviceChange) {
            onDeviceChange(type, deviceId);
        }
    };

    if (loading) {
        return (
            <div className="device-selector loading">
                <span>Loading devices...</span>
            </div>
        );
    }

    return (
        <div className="device-selector">
            <button 
                className="device-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Device settings"
                aria-expanded={isOpen}
            >
                <span>Devices</span>
                <ChevronDown 
                    size={16} 
                    className={`chevron ${isOpen ? 'open' : ''}`}
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <div className="device-selector-panel" role="dialog" aria-label="Device selection">
                    {/* Camera Selection */}
                    <div className="device-group">
                        <label htmlFor="camera-select" className="device-label">
                            <Camera size={16} aria-hidden="true" />
                            <span>Camera</span>
                        </label>
                        <select
                            id="camera-select"
                            value={selectedDevices.camera}
                            onChange={(e) => handleDeviceSelect('camera', e.target.value)}
                            className="device-select"
                            disabled={devices.cameras.length === 0}
                        >
                            {devices.cameras.length === 0 ? (
                                <option>No cameras found</option>
                            ) : (
                                devices.cameras.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Microphone Selection */}
                    <div className="device-group">
                        <label htmlFor="microphone-select" className="device-label">
                            <Mic size={16} aria-hidden="true" />
                            <span>Microphone</span>
                        </label>
                        <select
                            id="microphone-select"
                            value={selectedDevices.microphone}
                            onChange={(e) => handleDeviceSelect('microphone', e.target.value)}
                            className="device-select"
                            disabled={devices.microphones.length === 0}
                        >
                            {devices.microphones.length === 0 ? (
                                <option>No microphones found</option>
                            ) : (
                                devices.microphones.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Speaker Selection */}
                    <div className="device-group">
                        <label htmlFor="speaker-select" className="device-label">
                            <Speaker size={16} aria-hidden="true" />
                            <span>Speaker</span>
                        </label>
                        <select
                            id="speaker-select"
                            value={selectedDevices.speaker}
                            onChange={(e) => handleDeviceSelect('speaker', e.target.value)}
                            className="device-select"
                            disabled={devices.speakers.length === 0}
                        >
                            {devices.speakers.length === 0 ? (
                                <option>No speakers found</option>
                            ) : (
                                devices.speakers.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="device-info">
                        <p>
                            {devices.cameras.length} camera{devices.cameras.length !== 1 ? 's' : ''}, {' '}
                            {devices.microphones.length} microphone{devices.microphones.length !== 1 ? 's' : ''}, {' '}
                            {devices.speakers.length} speaker{devices.speakers.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceSelector;
