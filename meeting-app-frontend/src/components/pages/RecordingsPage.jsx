import React, { useState, useEffect } from 'react';
import { MdPlayCircle, MdDownload, MdDelete, MdAccessTime, MdVideoCall } from 'react-icons/md';
import { FiLoader } from 'react-icons/fi';
import recordingsAPI from '../../api/recordings';
import './Pages.css';

const RecordingsPage = () => {
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRecordings();
    }, []);

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await recordingsAPI.getUserRecordings();
            setRecordings(response.recordings || []);
        } catch (err) {
            console.error('Failed to fetch recordings:', err);
            setError(err.message || 'Failed to load recordings');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (recordingId, filename) => {
        try {
            const blob = await recordingsAPI.downloadRecording(recordingId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download recording');
        }
    };

    const handleDelete = async (recordingId) => {
        if (!window.confirm('Delete this recording? This cannot be undone.')) return;
        
        try {
            await recordingsAPI.deleteRecording(recordingId);
            setRecordings(prev => prev.filter(r => r.id !== recordingId));
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete recording');
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <>
            <div className="page-header-section">
                <div className="page-header-left">
                    <div className="page-icon-wrapper page-icon-green">
                        <MdPlayCircle size={24} />
                    </div>
                    <div className="page-header-info">
                        <h1 className="page-title-main">Recordings</h1>
                        <p className="page-subtitle-main">
                            {recordings.length} {recordings.length === 1 ? 'recording' : 'recordings'} available
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <FiLoader size={32} className="loading-spinner" />
                    <p className="loading-text">Loading recordings…</p>
                </div>
            ) : error ? (
                <div className="content-card">
                    <div className="content-card-body">
                        <div className="error-container">
                            <div className="error-icon-wrapper">
                                <MdPlayCircle size={32} className="error-icon" />
                            </div>
                            <p className="error-text">{error}</p>
                            <button onClick={fetchRecordings} className="btn-primary">
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            ) : recordings.length === 0 ? (
                <div className="content-card">
                    <div className="content-card-body">
                        <div className="empty-state-container">
                            <div className="empty-icon-wrapper">
                                <MdPlayCircle size={32} className="empty-icon" />
                            </div>
                            <p className="empty-title">No Recordings Yet</p>
                            <p className="empty-description">Your meeting recordings will appear here</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {recordings.map(recording => (
                        <div key={recording.id} className="content-card" style={{ overflow: 'hidden' }}>
                            {/* Thumbnail */}
                            <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MdVideoCall size={48} style={{ color: '#ffffff', opacity: 0.5 }} />
                            </div>

                            {/* Content */}
                            <div style={{ padding: '16px' }}>
                                <h3 style={{ fontWeight: '600', color: '#0f172a', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {recording.meeting_title || 'Untitled Recording'}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MdAccessTime size={12} />
                                        {new Date(recording.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                    {recording.duration && (
                                        <div>Duration: {formatDuration(recording.duration)}</div>
                                    )}
                                    {recording.file_size && (
                                        <div>Size: {formatFileSize(recording.file_size)}</div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleDownload(recording.id, recording.filename)}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '10px 14px',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                                        }}
                                    >
                                        <MdDownload size={16} />
                                        Download
                                    </button>
                                    <button
                                        onClick={() => handleDelete(recording.id)}
                                        className="btn-icon"
                                        style={{ color: '#ef4444' }}
                                    >
                                        <MdDelete size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default RecordingsPage;
