import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Pin, WifiOff } from 'lucide-react';

const VideoTile = ({ participant, isActiveSpeaker, isPinned, reactions, onPin }) => {
  const videoRef = useRef(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      setShowVideo(participant.isVideoEnabled);
    }
  }, [participant.stream, participant.isVideoEnabled]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];
    return gradients[(name?.charCodeAt(0) || 0) % gradients.length];
  };

  const renderFallback = () => {
    if (participant.profilePhoto) {
      return <img src={participant.profilePhoto} alt={`${participant.username}'s profile`} className="video-fallback-photo-advanced" />;
    }
    return (
      <div className="video-fallback-initials-advanced" style={{ background: getGradient(participant.username) }}>
        {getInitials(participant.username)}
      </div>
    );
  };

  return (
    <div className={`video-tile-advanced ${isActiveSpeaker ? 'active-speaker-advanced' : ''} ${isPinned ? 'pinned-advanced' : ''}`}>
      <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className={`video-element-advanced ${showVideo ? 'visible' : 'hidden'}`} />
      {!showVideo && <div className="video-fallback-advanced">{renderFallback()}</div>}
      
      {reactions.map(r => (
        <div key={r.id} className="reaction-overlay-advanced">{r.reaction}</div>
      ))}

      <div className="video-overlay-advanced">
        <div className="video-info-advanced">
          <span className="participant-name-advanced">{participant.username} {participant.isLocal && '(You)'}</span>
          <div className="participant-badges-advanced">
            {!participant.isAudioEnabled && <span className="badge-advanced badge-muted-advanced"><MicOff size={14} /></span>}
            {participant.handRaised && <span className="badge-advanced badge-hand-advanced">✋</span>}
            {participant.connectionStatus === 'disconnected' && <span className="badge-advanced badge-disconnected-advanced"><WifiOff size={14} /></span>}
          </div>
        </div>
        <button className="pin-button-advanced" onClick={onPin} aria-label={isPinned ? 'Unpin' : 'Pin'}>
          <Pin size={16} />
        </button>
      </div>
    </div>
  );
};

export default VideoTile;
