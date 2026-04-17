import React, { useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  Hand, MessageSquare, Users, Link2, Check, PhoneOff, Play
} from 'lucide-react';

const ControlBar = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  handRaised,
  chatOpen,
  participantsOpen,
  unreadCount,
  hasStream,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onToggleChat,
  onToggleParticipants,
  onCopyLink,
  onLeave,
  onStartCamera,
}) => {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [clickedButton, setClickedButton] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleCopyLink = () => {
    console.log('🔗 [ControlBar] Copy link clicked');
    onCopyLink();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleButtonClick = (buttonName, callback) => {
    console.log(`🔘 [ControlBar] ${buttonName} clicked`);
    setClickedButton(buttonName);
    setTimeout(() => setClickedButton(null), 200);
    callback();
  };

  const handleStartCamera = async () => {
    setIsStarting(true);
    try {
      await onStartCamera();
    } catch (error) {
      console.error('Failed to start camera:', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="control-bar" role="toolbar" aria-label="Meeting controls">
      <div className="control-group">
        {!hasStream ? (
          // Show green "Start" buttons when no stream
          <>
            <button
              className="control-btn start-needed"
              onClick={handleStartCamera}
              disabled={isStarting}
              aria-label="Start microphone"
              title="Click to start microphone"
            >
              <Mic size={20} />
            </button>

            <button
              className="control-btn start-needed"
              onClick={handleStartCamera}
              disabled={isStarting}
              aria-label="Start camera"
              title="Click to start camera"
            >
              <Video size={20} />
            </button>
          </>
        ) : (
          // Show normal toggle buttons when stream exists
          <>
            <button
              className={`control-btn ${!isAudioEnabled ? 'off' : ''} ${clickedButton === 'audio' ? 'clicked' : ''}`}
              onClick={() => handleButtonClick('audio', onToggleAudio)}
              aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            <button
              className={`control-btn ${!isVideoEnabled ? 'off' : ''} ${clickedButton === 'video' ? 'clicked' : ''}`}
              onClick={() => handleButtonClick('video', onToggleVideo)}
              aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              title={isVideoEnabled ? 'Stop video' : 'Start video'}
            >
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            <button
              className={`control-btn ${isScreenSharing ? 'active' : ''} ${clickedButton === 'screen' ? 'clicked' : ''}`}
              onClick={() => handleButtonClick('screen', onToggleScreenShare)}
              aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </button>
          </>
        )}
      </div>

      <div className="control-group">
        <button
          className={`control-btn ${handRaised ? 'active' : ''} ${clickedButton === 'hand' ? 'clicked' : ''}`}
          onClick={() => handleButtonClick('hand', onToggleHandRaise)}
          aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
          disabled={!hasStream}
        >
          <Hand size={20} />
        </button>

        <button
          className={`control-btn ${chatOpen ? 'active' : ''} ${clickedButton === 'chat' ? 'clicked' : ''}`}
          onClick={() => handleButtonClick('chat', onToggleChat)}
          aria-label="Toggle chat"
          title="Chat"
        >
          <MessageSquare size={20} />
          {unreadCount > 0 && (
            <span className="unread-badge" aria-label={`${unreadCount} unread messages`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          className={`control-btn ${participantsOpen ? 'active' : ''} ${clickedButton === 'participants' ? 'clicked' : ''}`}
          onClick={() => handleButtonClick('participants', onToggleParticipants)}
          aria-label="Toggle participants"
          title="Participants"
        >
          <Users size={20} />
        </button>

        <button
          className={`control-btn ${clickedButton === 'link' ? 'clicked' : ''}`}
          onClick={handleCopyLink}
          aria-label="Copy meeting link"
          title={copyFeedback ? 'Copied!' : 'Copy link'}
        >
          {copyFeedback ? <Check size={20} /> : <Link2 size={20} />}
        </button>
      </div>

      <div className="control-group">
        <button
          className={`control-btn leave ${clickedButton === 'leave' ? 'clicked' : ''}`}
          onClick={() => handleButtonClick('leave', onLeave)}
          aria-label="Leave meeting"
          title="Leave meeting"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
