import React, { useEffect, useRef } from 'react';
import './Video.css';

const VideoPlayer = ({ stream, isLocal, muted, userName }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`video-container ${isLocal ? 'local-video' : 'remote-video'}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className="video-element"
            />
            <div className="video-overlay">
                <span className="user-name">{userName}</span>
                {isLocal && <span className="local-badge">You</span>}
            </div>
        </div>
    );
};

export default VideoPlayer;