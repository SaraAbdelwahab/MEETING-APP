import React from 'react';
import './Video.css';

// Import icons
import { 
    FaMicrophone, 
    FaMicrophoneSlash, 
    FaVideo, 
    FaVideoSlash, 
    FaDesktop, 
    FaPhoneSlash 
} from 'react-icons/fa';

const CallControls = ({
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    inCall,
    onToggleAudio,
    onToggleVideo,
    onShareScreen,
    onLeaveCall
}) => {
    return (
        <div className="call-controls">
            <button
                className={`control-btn ${!isAudioEnabled ? 'off' : ''}`}
                onClick={onToggleAudio}
                title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
                 {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>

            <button
                className={`control-btn ${!isVideoEnabled ? 'off' : ''}`}
                onClick={onToggleVideo}
                title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
                 {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
            </button>

            <button
                className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                onClick={onShareScreen}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
                <FaDesktop /> 
            </button>

            <button
                className="control-btn leave-btn"
                onClick={onLeaveCall}
                title="Leave call"
            >
               <FaPhoneSlash />
            </button>
        </div>
    );
};

export default CallControls;