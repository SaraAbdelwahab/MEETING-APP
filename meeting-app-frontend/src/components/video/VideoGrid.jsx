import React from 'react';
import VideoPlayer from './VideoPlayer';
import { useAuth } from '../../context/AuthContext';
import './Video.css';
import { FaMicrophoneSlash, FaVideoSlash } from 'react-icons/fa';

const VideoGrid = ({ localStream, remoteStreams, isAudioEnabled, isVideoEnabled }) => {
    const { user } = useAuth();

    // Calculate grid layout based on number of participants
    const getGridClass = () => {
        const totalParticipants = 1 + Object.keys(remoteStreams).length;
        
        if (totalParticipants === 1) return 'single';
        if (totalParticipants === 2) return 'pair';
        if (totalParticipants <= 4) return 'quad';
        if (totalParticipants <= 9) return 'nine';
        return 'many';
    };

    return (
        <div className={`video-grid ${getGridClass()}`}>
            {/* Local video */}
            {localStream && (
                <div className="video-wrapper">
                    <VideoPlayer
                        stream={localStream}
                        isLocal
                        muted={true}
                        userName={user?.email || 'You'}
                    />
                    <div className="video-controls-indicator">
                        {!isAudioEnabled && (
                            <div className="indicator muted-audio"> <FaMicrophoneSlash /></div>
                        )}
                        {!isVideoEnabled && (
                            <div className="indicator muted-video"><FaVideoSlash /></div>
                        )}
                    </div>
                </div>
            )}

            {/* Remote videos */}
            {Object.entries(remoteStreams).map(([userId, { stream, email }]) => (
                <div key={userId} className="video-wrapper">
                    <VideoPlayer
                        stream={stream}
                        isLocal={false}
                        muted={false}
                        userName={email}
                    />
                </div>
            ))}

            {/* Empty state */}
            {Object.keys(remoteStreams).length === 0 && localStream && (
                <div className="waiting-participants">
                    <div className="waiting-content">
                        <span className="waiting-icon">👋</span>
                        <h3>Waiting for others to join</h3>
                        <p>Share the meeting link to invite participants</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoGrid;