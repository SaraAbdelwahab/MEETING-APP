import React, { useEffect, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, AlertCircle, CheckCircle, AlertTriangle, Video, Loader } from 'lucide-react';

const MediaDiagnostics = ({ localStream, isAudioEnabled, isVideoEnabled, onStartCamera }) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setLastUpdate(Date.now());
  }, [isAudioEnabled, isVideoEnabled, localStream]);

  const hasVideo = localStream && localStream.getVideoTracks().length > 0;
  const hasAudio = localStream && localStream.getAudioTracks().length > 0;
  
  const videoTrack = hasVideo ? localStream.getVideoTracks()[0] : null;
  const audioTrack = hasAudio ? localStream.getAudioTracks()[0] : null;

  // Check for state mismatch
  const videoMismatch = isVideoEnabled && !hasVideo;
  const audioMismatch = isAudioEnabled && !hasAudio;

  const handleStartCamera = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await onStartCamera();
    } catch (err) {
      setError(err.message || 'Failed to start camera');
      console.error('❌ [Diagnostics] Camera start failed:', err);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="media-diagnostics">
      <div className="diagnostic-header">
        <strong>Media Status</strong>
        <span className="last-update">Updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
      </div>

      {!localStream && (
        <>
          <div className="diagnostic-item" style={{ color: '#fbbc04' }}>
            <AlertTriangle size={16} className="status-warning" />
            <span>No media stream - Camera not started</span>
          </div>
          <button 
            className="start-camera-btn"
            onClick={handleStartCamera}
            disabled={isStarting}
            style={{
              width: '100%',
              padding: '0.625rem',
              background: isStarting 
                ? 'rgba(99, 102, 241, 0.5)' 
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: isStarting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              opacity: isStarting ? 0.7 : 1
            }}
            onMouseOver={(e) => !isStarting && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {isStarting ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Starting...
              </>
            ) : (
              <>
                <Video size={16} />
                Start Camera & Mic
              </>
            )}
          </button>
          {error && (
            <div className="diagnostic-item" style={{ color: '#ea4335', fontSize: '0.75rem' }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      <div className="diagnostic-item">
        {hasVideo ? (
          <CheckCircle size={16} className="status-ok" />
        ) : (
          <AlertCircle size={16} className="status-error" />
        )}
        <span>Camera: {hasVideo ? videoTrack?.label || 'Active' : 'Not detected'}</span>
        {hasVideo && (
          <span className="track-state">
            {videoTrack.enabled ? <Camera size={14} /> : <CameraOff size={14} />}
          </span>
        )}
      </div>

      <div className="diagnostic-item">
        {hasAudio ? (
          <CheckCircle size={16} className="status-ok" />
        ) : (
          <AlertCircle size={16} className="status-error" />
        )}
        <span>Microphone: {hasAudio ? audioTrack?.label || 'Active' : 'Not detected'}</span>
        {hasAudio && (
          <span className="track-state">
            {audioTrack.enabled ? <Mic size={14} /> : <MicOff size={14} />}
          </span>
        )}
      </div>

      <div className="diagnostic-item">
        <span style={{ fontSize: '0.75rem', color: videoMismatch || audioMismatch ? '#fbbc04' : '#9aa0a6' }}>
          State: Video {isVideoEnabled ? '✅' : '❌'} | Audio {isAudioEnabled ? '✅' : '❌'}
        </span>
      </div>

      {(videoMismatch || audioMismatch) && localStream && (
        <div className="diagnostic-item" style={{ color: '#fbbc04', fontSize: '0.75rem' }}>
          <AlertTriangle size={14} />
          <span>⚠️ State mismatch - Try toggling controls</span>
        </div>
      )}

      {localStream && (
        <div className="diagnostic-item">
          <CheckCircle size={16} className="status-ok" />
          <span>Stream: {localStream.id.substring(0, 8)}... ({localStream.active ? 'Active' : 'Inactive'})</span>
        </div>
      )}

      {hasVideo && videoTrack && (
        <div className="diagnostic-item" style={{ fontSize: '0.7rem', color: '#9aa0a6' }}>
          <span>Track: {videoTrack.readyState} | Enabled: {videoTrack.enabled ? 'Yes' : 'No'}</span>
        </div>
      )}
    </div>
  );
};

export default MediaDiagnostics;
