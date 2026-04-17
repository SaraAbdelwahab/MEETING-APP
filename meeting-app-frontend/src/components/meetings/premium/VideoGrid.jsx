import React from 'react';
import VideoTile from './VideoTile';

const VideoGrid = ({ participants, activeSpeaker, pinnedUserId, onPinParticipant }) => {
  const pinnedParticipant = participants.find((p) => p.userId === pinnedUserId);
  const otherParticipants = participants.filter((p) => p.userId !== pinnedUserId);

  const getGridClass = (count) => {
    if (count === 1) return 'grid-single';
    if (count === 2) return 'grid-two';
    if (count <= 4) return 'grid-four';
    if (count <= 6) return 'grid-six';
    return 'grid-many';
  };

  return (
    <div className="video-grid-container" role="region" aria-label="Video participants">
      {pinnedParticipant && (
        <div className="video-spotlight">
          <VideoTile
            participant={pinnedParticipant}
            isActiveSpeaker={activeSpeaker === pinnedParticipant.userId}
            isPinned={true}
            onPin={() => onPinParticipant(pinnedParticipant.userId)}
          />
        </div>
      )}

      <div className={`video-grid ${getGridClass(otherParticipants.length)}`}>
        {otherParticipants.map((participant) => (
          <VideoTile
            key={participant.userId || participant.socketId}
            participant={participant}
            isActiveSpeaker={activeSpeaker === participant.userId}
            isPinned={false}
            onPin={() => onPinParticipant(participant.userId)}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;
