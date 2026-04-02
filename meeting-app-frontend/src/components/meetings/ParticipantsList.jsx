import React from 'react';
import './ParticipantsList.css';

const ParticipantsList = ({ participants, isCreator, onRemoveParticipant }) => {
    // Group participants by status
    const groupedParticipants = {
        accepted: participants.filter(p => p.status === 'accepted'),
        pending: participants.filter(p => p.status === 'pending'),
        declined: participants.filter(p => p.status === 'declined')
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'accepted':
                return '✅';
            case 'declined':
                return '❌';
            case 'pending':
                return '⏳';
            default:
                return '❓';
        }
    };

    const getStatusClass = (status) => {
        return `status-${status}`;
    };

    return (
        <div className="participants-container">
            <div className="participants-header">
                <h3>Participants ({participants.length})</h3>
                <div className="participants-summary">
                    <span className="summary-badge accepted">
                        ✅ {groupedParticipants.accepted.length}
                    </span>
                    <span className="summary-badge pending">
                        ⏳ {groupedParticipants.pending.length}
                    </span>
                    <span className="summary-badge declined">
                        ❌ {groupedParticipants.declined.length}
                    </span>
                </div>
            </div>

            <div className="participants-list">
                {/* Accepted Participants */}
                {groupedParticipants.accepted.length > 0 && (
                    <div className="participant-group">
                        <h4 className="group-title">Accepted</h4>
                        {groupedParticipants.accepted.map(participant => (
                            <div key={participant.id} className="participant-item">
                                <div className="participant-info">
                                    <span className="status-icon">✅</span>
                                    <div className="participant-details">
                                        <span className="participant-name">
                                            {participant.name}
                                        </span>
                                        <span className="participant-email">
                                            {participant.email}
                                        </span>
                                    </div>
                                </div>
                                {isCreator && (
                                    <button
                                        className="remove-participant"
                                        onClick={() => onRemoveParticipant(participant.id)}
                                        title="Remove participant"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Pending Participants */}
                {groupedParticipants.pending.length > 0 && (
                    <div className="participant-group">
                        <h4 className="group-title">Pending</h4>
                        {groupedParticipants.pending.map(participant => (
                            <div key={participant.id} className="participant-item">
                                <div className="participant-info">
                                    <span className="status-icon">⏳</span>
                                    <div className="participant-details">
                                        <span className="participant-name">
                                            {participant.name}
                                        </span>
                                        <span className="participant-email">
                                            {participant.email}
                                        </span>
                                    </div>
                                </div>
                                {isCreator && (
                                    <button
                                        className="remove-participant"
                                        onClick={() => onRemoveParticipant(participant.id)}
                                        title="Remove participant"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Declined Participants */}
                {groupedParticipants.declined.length > 0 && (
                    <div className="participant-group">
                        <h4 className="group-title">Declined</h4>
                        {groupedParticipants.declined.map(participant => (
                            <div key={participant.id} className="participant-item declined">
                                <div className="participant-info">
                                    <span className="status-icon">❌</span>
                                    <div className="participant-details">
                                        <span className="participant-name">
                                            {participant.name}
                                        </span>
                                        <span className="participant-email">
                                            {participant.email}
                                        </span>
                                    </div>
                                </div>
                                {isCreator && (
                                    <button
                                        className="remove-participant"
                                        onClick={() => onRemoveParticipant(participant.id)}
                                        title="Remove participant"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {participants.length === 0 && (
                    <div className="no-participants">
                        <p>No participants yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParticipantsList;