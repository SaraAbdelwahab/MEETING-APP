import React, { useState } from 'react';

const ParticipantPanel = ({
  participants,
  raisedHands,
  activeSpeaker,
  currentUserId,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParticipants = participants.filter((p) =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const raisedHandParticipants = filteredParticipants.filter((p) => p.handRaised);
  const otherParticipants = filteredParticipants.filter((p) => !p.handRaised);

  const renderParticipant = (participant) => {
    const isHost = participant.role === 'host' || participant.isHost;
    const isSpeaking = activeSpeaker === participant.userId;
    const isYou = participant.userId === currentUserId;

    return (
      <div
        key={participant.userId || participant.socketId}
        className={`participant-item ${isSpeaking ? 'speaking' : ''}`}
        role="listitem"
      >
        <div className="participant-avatar">
          {participant.profilePhoto ? (
            <img
              src={participant.profilePhoto}
              alt={`${participant.username}'s avatar`}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {participant.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="participant-info">
          <div className="participant-name-row">
            <span className="participant-name">
              {participant.username}
              {isYou && ' (You)'}
            </span>
            {isHost && <span className="host-badge">Host</span>}
          </div>

          <div className="participant-status">
            {!participant.isAudioEnabled && (
              <span className="status-icon muted" aria-label="Muted">
                🔇
              </span>
            )}
            {!participant.isVideoEnabled && (
              <span className="status-icon camera-off" aria-label="Camera off">
                📷
              </span>
            )}
            {isSpeaking && (
              <span className="status-icon speaking" aria-label="Speaking">
                🔊
              </span>
            )}
            {participant.handRaised && (
              <span className="status-icon hand-raised" aria-label="Hand raised">
                ✋
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="participant-panel" role="complementary" aria-label="Participants">
      <div className="panel-header">
        <h2 className="panel-title">
          Participants ({participants.length})
        </h2>
        <button
          className="panel-close"
          onClick={onClose}
          aria-label="Close participants panel"
        >
          ✕
        </button>
      </div>

      <div className="participant-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search participants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search participants"
        />
      </div>

      <div className="participant-list" role="list">
        {raisedHandParticipants.length > 0 && (
          <div className="participant-section">
            <h3 className="section-title">Raised Hands ({raisedHandParticipants.length})</h3>
            {raisedHandParticipants.map(renderParticipant)}
          </div>
        )}

        {activeSpeaker && (
          <div className="participant-section">
            <h3 className="section-title">Current Speaker</h3>
            {otherParticipants
              .filter((p) => p.userId === activeSpeaker)
              .map(renderParticipant)}
          </div>
        )}

        <div className="participant-section">
          <h3 className="section-title">All Participants</h3>
          {otherParticipants.length === 0 ? (
            <p className="no-results">No participants found</p>
          ) : (
            otherParticipants.map(renderParticipant)
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantPanel;
