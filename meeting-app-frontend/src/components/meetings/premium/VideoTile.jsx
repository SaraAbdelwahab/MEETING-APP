import React, { useEffect, useRef, useState } from 'react';

const VideoTile = ({ participant, isActiveSpeaker, isPinned, onPin }) => {
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
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getEmailAvatar = (email) => {
    if (!email) return null;
    const initial = email[0].toUpperCase();
    return initial;
  };

  const getGradientColor = (name) => {
    if (!name) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderFallback = () => {
    // Priority: profile photo > email avatar > initials > gradient
    if (participant.profilePhoto) {
      return (
        <img
          src={participant.profilePhoto}
          alt={`${participant.username}'s profile`}
          className="video-fallback-photo"
        />
      );
    }

    if (participant.email) {
      return (
        <div className="video-fallback-email">
          {getEmailAvatar(participant.email)}
        </div>
      );
    }

    return (
      <div
        className="video-fallback-initials"
        style={{ background: getGradientColor(participant.username) }}
      >
        {getInitials(participant.username)}
      </div>
    );
  };

  return (
    <div
      className={`video-tile ${isActiveSpeaker ? 'active-speaker' : ''} ${
        isPinned ? 'pinned' : ''
      }`}
      role="article"
      aria-label={`${participant.username}${isActiveSpeaker ? ', speaking' : ''}${
        !participant.isAudioEnabled ? ', muted' : ''
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={`video-element ${showVideo ? 'visible' : 'hidden'}`}
        aria-hidden={!showVideo}
      />

      {!showVideo && <div className="video-fallback">{renderFallback()}</div>}

      <div className="video-overlay">
        <div className="video-info">
          <span className="participant-name">
            {participant.username} {participant.isLocal && '(You)'}
          </span>

          <div className="participant-badges">
            {!participant.isAudioEnabled && (
              <span
                className="badge badge-muted"
                role="status"
                aria-label="Microphone muted"
              >
                🔇
              </span>
            )}
            {participant.handRaised && (
              <span
                className="badge badge-hand"
                role="status"
                aria-label="Hand raised"
              >
                ✋
              </span>
            )}
            {participant.connectionStatus === 'reconnecting' && (
              <span
                className="badge badge-reconnecting"
                role="status"
                aria-label="Reconnecting"
              >
                ◐
              </span>
            )}
            {participant.connectionStatus === 'disconnected' && (
              <span
                className="badge badge-disconnected"
                role="status"
                aria-label="Disconnected"
              >
                ⚠
              </span>
            )}
          </div>
        </div>

        <button
          className="pin-button"
          onClick={onPin}
          aria-label={isPinned ? 'Unpin participant' : 'Pin participant'}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          📌
        </button>
      </div>
    </div>
  );
};

export default VideoTile;
