import React, { useEffect } from 'react';
import { useWebRTC } from '../../context/WebRTCContext';
import { useAuth } from '../../context/AuthContext';
import VideoGrid from './VideoGrid';
import CallControls from './CallControls';
import './Video.css';

const CallInterface = ({ meetingId, onClose }) => {
    const { user } = useAuth();
    const {
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        inCall,
        error,
        joinCall,
        leaveCall,
        toggleAudio,
        toggleVideo,
        shareScreen
    } = useWebRTC();



    useEffect(() => {
        if (meetingId) {
            joinCall(meetingId);
        }

        return () => {
            leaveCall();
        };
    }, [meetingId]);

    const handleLeaveCall = () => {
        leaveCall();
        onClose?.();
    };

    

     if (error) {
        return (
            <div className="call-interface-error">
                <div className="error-icon">🎥❌</div>
                <h3>Camera & Microphone Required</h3>
                <p>{error}</p>
                <div className="permission-help">
                    <h4>How to allow camera access:</h4>
                    <ol>
                        <li>Click the lock icon 🔒 in the address bar</li>
                        <li>Find "Camera" and "Microphone"</li>
                        <li>Change from "Block" to "Allow"</li>
                        <li>Click "Refresh" or reload the page</li>
                    </ol>
                </div>
                <button 
                    className="btn btn-primary"
                    onClick={() => {
                        // Try to request permissions again
                        window.location.reload();
                    }}
                >  Refresh Page & Try Again
                </button>
                <button 
                    className="btn btn-secondary"
                    onClick={onClose}
                >
                    Cancel
                </button>
            </div>
        );
    }



    if (!inCall && !localStream) {
        return (
            <div className="call-interface connecting">
                <div className="connecting-spinner"></div>
                <p>Connecting to call...</p>
            </div>
        );
    }

    return (
        <div className="call-interface">
            <VideoGrid
                localStream={localStream}
                remoteStreams={remoteStreams}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
            />

            <CallControls
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isScreenSharing={isScreenSharing}
                inCall={inCall}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onShareScreen={shareScreen}
                onLeaveCall={handleLeaveCall}
            />
        </div>
    );
};

export default CallInterface;