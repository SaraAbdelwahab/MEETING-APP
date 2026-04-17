import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import { Check, X, Loader2, Camera, Mic, Wifi } from 'lucide-react';

/**
 * Real Data Test Component
 * Tests camera, microphone, and socket with REAL data
 */
const RealDataTest = () => {
    const { user, isAuthenticated } = useAuth();
    const { connected: socketConnected, socket } = useSocket();
    const { 
        localStream, 
        isAudioEnabled, 
        isVideoEnabled,
        error: webrtcError,
        initializeMedia 
    } = useWebRTC();

    const [cameraStatus, setCameraStatus] = useState('pending'); // pending, success, error
    const [micStatus, setMicStatus] = useState('pending');
    const [socketStatus, setSocketStatus] = useState('pending');
    const [testResults, setTestResults] = useState([]);
    const [isTestingCamera, setIsTestingCamera] = useState(false);
    
    const videoRef = useRef(null);

    // Monitor socket connection
    useEffect(() => {
        if (socketConnected) {
            setSocketStatus('success');
            addTestResult('✅ Socket connected successfully', 'success');
        } else {
            setSocketStatus('error');
            addTestResult('❌ Socket not connected', 'error');
        }
    }, [socketConnected]);

    // Monitor camera stream
    useEffect(() => {
        if (localStream) {
            const videoTracks = localStream.getVideoTracks();
            const audioTracks = localStream.getAudioTracks();

            if (videoTracks.length > 0) {
                setCameraStatus('success');
                addTestResult(`✅ Camera active: ${videoTracks[0].label}`, 'success');
                
                // Display video in preview
                if (videoRef.current) {
                    videoRef.current.srcObject = localStream;
                }
            } else {
                setCameraStatus('error');
                addTestResult('❌ No video track found', 'error');
            }

            if (audioTracks.length > 0) {
                setMicStatus('success');
                addTestResult(`✅ Microphone active: ${audioTracks[0].label}`, 'success');
            } else {
                setMicStatus('error');
                addTestResult('❌ No audio track found', 'error');
            }
        }
    }, [localStream]);

    // Monitor WebRTC errors
    useEffect(() => {
        if (webrtcError) {
            setCameraStatus('error');
            setMicStatus('error');
            addTestResult(`❌ WebRTC Error: ${webrtcError}`, 'error');
        }
    }, [webrtcError]);

    const addTestResult = (message, type) => {
        setTestResults(prev => {
            // Avoid duplicates
            if (prev.some(r => r.message === message)) return prev;
            return [...prev, { 
                message, 
                type, 
                timestamp: new Date().toLocaleTimeString() 
            }];
        });
    };

    const testCamera = async () => {
        setIsTestingCamera(true);
        setCameraStatus('pending');
        setMicStatus('pending');
        addTestResult('🔄 Requesting camera and microphone access...', 'info');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();

            if (videoTracks.length > 0) {
                setCameraStatus('success');
                addTestResult(`✅ Camera: ${videoTracks[0].label}`, 'success');
                addTestResult(`   Resolution: ${videoTracks[0].getSettings().width}x${videoTracks[0].getSettings().height}`, 'info');
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }

            if (audioTracks.length > 0) {
                setMicStatus('success');
                addTestResult(`✅ Microphone: ${audioTracks[0].label}`, 'success');
                addTestResult(`   Sample Rate: ${audioTracks[0].getSettings().sampleRate} Hz`, 'info');
            }

            addTestResult('✅ All media devices working!', 'success');

        } catch (error) {
            setCameraStatus('error');
            setMicStatus('error');
            addTestResult(`❌ Error: ${error.name} - ${error.message}`, 'error');
            
            if (error.name === 'NotAllowedError') {
                addTestResult('💡 Click the lock icon in address bar and allow camera/mic', 'info');
            }
        } finally {
            setIsTestingCamera(false);
        }
    };

    const testSocket = () => {
        addTestResult('🔄 Testing socket connection...', 'info');
        
        if (socket && socket.connected) {
            setSocketStatus('success');
            addTestResult(`✅ Socket ID: ${socket.id}`, 'success');
            addTestResult(`✅ Socket URL: ${socket.io.uri}`, 'info');
            addTestResult(`✅ Transport: ${socket.io.engine.transport.name}`, 'info');
        } else {
            setSocketStatus('error');
            addTestResult('❌ Socket not connected', 'error');
            addTestResult('💡 Make sure backend server is running on port 5000', 'info');
        }
    };

    const getStatusIcon = (status) => {
        if (status === 'success') return <Check size={20} className="text-green-500" />;
        if (status === 'error') return <X size={20} className="text-red-500" />;
        return <Loader2 size={20} className="animate-spin text-yellow-500" />;
    };

    const getStatusColor = (status) => {
        if (status === 'success') return 'bg-green-100 border-green-500';
        if (status === 'error') return 'bg-red-100 border-red-500';
        return 'bg-yellow-100 border-yellow-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                    <h1 className="text-4xl font-bold text-white mb-2">🔬 Real Data Test</h1>
                    <p className="text-gray-300 mb-8">Test camera, microphone, and socket with real data</p>

                    {/* User Info */}
                    <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                        <h3 className="text-white font-semibold mb-2">👤 User Information</h3>
                        <div className="text-gray-300 space-y-1">
                            <p>Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                            <p>Email: {user?.email || 'Not logged in'}</p>
                            <p>User ID: {user?.id || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Camera Status */}
                        <div className={`rounded-xl p-6 border-2 ${getStatusColor(cameraStatus)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <Camera size={32} className="text-gray-700" />
                                {getStatusIcon(cameraStatus)}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Camera</h3>
                            <p className="text-sm text-gray-600">
                                {cameraStatus === 'success' ? 'Active' : 
                                 cameraStatus === 'error' ? 'Not Working' : 'Not Tested'}
                            </p>
                        </div>

                        {/* Microphone Status */}
                        <div className={`rounded-xl p-6 border-2 ${getStatusColor(micStatus)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <Mic size={32} className="text-gray-700" />
                                {getStatusIcon(micStatus)}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Microphone</h3>
                            <p className="text-sm text-gray-600">
                                {micStatus === 'success' ? 'Active' : 
                                 micStatus === 'error' ? 'Not Working' : 'Not Tested'}
                            </p>
                        </div>

                        {/* Socket Status */}
                        <div className={`rounded-xl p-6 border-2 ${getStatusColor(socketStatus)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <Wifi size={32} className="text-gray-700" />
                                {getStatusIcon(socketStatus)}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Socket</h3>
                            <p className="text-sm text-gray-600">
                                {socketStatus === 'success' ? 'Connected' : 
                                 socketStatus === 'error' ? 'Disconnected' : 'Checking...'}
                            </p>
                        </div>
                    </div>

                    {/* Video Preview */}
                    <div className="bg-black rounded-xl overflow-hidden mb-6 aspect-video">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Test Buttons */}
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={testCamera}
                            disabled={isTestingCamera}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isTestingCamera ? (
                                <>
                                    <Loader2 size={20} className="inline animate-spin mr-2" />
                                    Testing...
                                </>
                            ) : (
                                '🎥 Test Camera & Mic'
                            )}
                        </button>
                        <button
                            onClick={testSocket}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                        >
                            📡 Test Socket
                        </button>
                    </div>

                    {/* Test Results Log */}
                    <div className="bg-black/50 rounded-xl p-6 border border-white/10">
                        <h3 className="text-white font-bold mb-4">📋 Test Results</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {testResults.length === 0 ? (
                                <p className="text-gray-400 italic">No tests run yet. Click a test button above.</p>
                            ) : (
                                testResults.map((result, index) => (
                                    <div 
                                        key={index}
                                        className={`p-3 rounded-lg ${
                                            result.type === 'success' ? 'bg-green-900/30 text-green-300' :
                                            result.type === 'error' ? 'bg-red-900/30 text-red-300' :
                                            'bg-blue-900/30 text-blue-300'
                                        }`}
                                    >
                                        <span className="text-xs text-gray-400 mr-3">{result.timestamp}</span>
                                        <span className="font-mono text-sm">{result.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Real Data Summary */}
                    <div className="mt-6 bg-white/5 rounded-xl p-6 border border-white/10">
                        <h3 className="text-white font-bold mb-4">📊 Real Data Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400">Video Enabled:</p>
                                <p className="text-white font-semibold">{isVideoEnabled ? '✅ Yes' : '❌ No'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Audio Enabled:</p>
                                <p className="text-white font-semibold">{isAudioEnabled ? '✅ Yes' : '❌ No'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Socket Connected:</p>
                                <p className="text-white font-semibold">{socketConnected ? '✅ Yes' : '❌ No'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Local Stream:</p>
                                <p className="text-white font-semibold">{localStream ? '✅ Active' : '❌ Inactive'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealDataTest;
