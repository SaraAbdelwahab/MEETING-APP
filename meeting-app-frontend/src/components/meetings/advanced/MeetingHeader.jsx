import React from 'react';
import { Wifi, WifiOff, Loader2, Circle, Radio } from 'lucide-react';

const MeetingHeader = ({ meetingTitle, meetingId, connectionStatus, networkQuality, participantCount, isRecording }) => {
  const statusConfig = {
    connected: { icon: Wifi, label: 'Connected', color: '#10b981' },
    connecting: { icon: Loader2, label: 'Connecting...', color: '#fbbf24', spin: true },
    reconnecting: { icon: Loader2, label: 'Reconnecting...', color: '#f59e0b', spin: true },
    disconnected: { icon: WifiOff, label: 'Disconnected', color: '#ef4444' },
  };

  const status = statusConfig[connectionStatus] || statusConfig.connected;
  const StatusIcon = status.icon;

  const qualityColors = { excellent: '#10b981', good: '#10b981', fair: '#fbbf24', poor: '#ef4444' };

  return (
    <header className="meeting-header-advanced">
      <div className="header-left">
        <h1 className="meeting-title-advanced">{meetingTitle}</h1>
        <span className="meeting-id-badge">{meetingId}</span>
        {isRecording && (
          <div className="recording-indicator">
            <Circle size={8} fill="#ef4444" color="#ef4444" className="recording-dot" />
            <span>Recording</span>
          </div>
        )}
      </div>
      <div className="header-right">
        <div className="connection-status" style={{ color: status.color }}>
          <StatusIcon size={16} className={status.spin ? 'spin' : ''} />
          <span>{status.label}</span>
        </div>
        <div className="network-quality" style={{ color: qualityColors[networkQuality] }}>
          <Radio size={16} />
          <span>{networkQuality}</span>
        </div>
        <div className="participant-count-badge">
          <span>{participantCount} {participantCount === 1 ? 'participant' : 'participants'}</span>
        </div>
      </div>
    </header>
  );
};

export default MeetingHeader;
