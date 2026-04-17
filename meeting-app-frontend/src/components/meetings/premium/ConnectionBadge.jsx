import React from 'react';

const ConnectionBadge = ({ status }) => {
  const statusConfig = {
    connected: {
      label: 'Connected',
      icon: '●',
      className: 'status-connected',
      ariaLabel: 'Connection status: Connected',
      show: false, // Hide when connected
    },
    connecting: {
      label: 'Connecting',
      icon: '◐',
      className: 'status-connecting',
      ariaLabel: 'Connection status: Connecting',
      show: true,
    },
    reconnecting: {
      label: 'Reconnecting',
      icon: '◐',
      className: 'status-reconnecting',
      ariaLabel: 'Connection status: Reconnecting',
      show: true,
    },
    disconnected: {
      label: 'Disconnected',
      icon: '○',
      className: 'status-disconnected',
      ariaLabel: 'Connection status: Disconnected',
      show: true,
    },
    'poor-network': {
      label: 'Poor Network',
      icon: '⚠',
      className: 'status-poor',
      ariaLabel: 'Connection status: Poor Network',
      show: true,
    },
  };

  const config = statusConfig[status] || statusConfig.disconnected;

  // Don't show badge when connected
  if (!config.show) {
    return null;
  }

  return (
    <div
      className={`connection-badge ${config.className}`}
      role="status"
      aria-label={config.ariaLabel}
      title={config.label}
    >
      <span className="connection-icon" aria-hidden="true">
        {config.icon}
      </span>
    </div>
  );
};

export default ConnectionBadge;
