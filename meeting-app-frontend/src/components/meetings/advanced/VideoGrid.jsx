import React from 'react';
import VideoTile from './VideoTile';

const VideoGrid = ({ participants, activeSpeaker, pinnedUserId, reactions, onPinParticipant }) => {
  const pinnedParticipant = participants.find(p => p.userId === pinnedUserId);
  const otherParticipants = participants.filter(p => p.userId !== pinnedUserId);

  const getGridClass = (count) => {
    if (count === 1) return 'grid-single';
    if (count === 2) return 'grid-two';
    if (count <= 4) return 'grid-four';
    if (count <= 6) return 'grid-six';
    if (count <= 9) return 'grid-nine';
    return 'grid-many';
  };

  const participantReactions = reactions.filter(r => otherParticipants.some(p => p.userId === r.userId));

  return (
    <div className="video-grid-advanced">
      {pinnedParticipant && (
        <div className="video-spotlight-advanced">
          <VideoTile participant={pinnedParticipant} isActiveSpeaker={activeSpeaker === pinnedParticipant.userId} isPinned={true} reactions={reactions.filter(r => r.userId === pinnedParticipant.userId)} onPin={() => onPinParticipant(pinnedParticipant.userId)} />
        </div>
      )}
      <div className={`video-grid-container-advanced ${getGridClass(otherParticipants.length)}`}>
        {otherParticipants.map(participant => (
          <VideoTile key={participant.userId || participant.socketId} participant={participant} isActiveSpeaker={activeSpeaker === participant.userId} isPinned={false} reactions={reactions.filter(r => r.userId === participant.userId)} onPin={() => onPinParticipant(participant.userId)} />
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;
