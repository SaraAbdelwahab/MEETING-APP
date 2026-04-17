import React from 'react';
import ConnectionBadge from './ConnectionBadge';

const MeetingHeader = ({ meetingTitle, meetingId, connectionStatus, participantCount }) => {
  return (
    <header className="meeting-header" role="banner">
      <div className="meeting-header-left">
        <h1 className="meeting-title">{meetingTitle}</h1>
        <span className="meeting-id" aria-label="Meeting ID">
          {meetingId}
        </span>
      </div>

      <div className="meeting-header-right">
        <ConnectionBadge status={connectionStatus} />
        <span className="participant-count" aria-label={`${participantCount} participants`}>
          {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
        </span>
      </div>
    </header>
  );
};

export default MeetingHeader;
