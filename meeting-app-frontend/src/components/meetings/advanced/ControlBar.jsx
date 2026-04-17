import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Hand, MessageSquare, Users, Link2, Check, PhoneOff, Smile, MoreVertical, Subtitles, Volume2, VolumeX } from 'lucide-react';

const ControlBar = ({ isAudioEnabled, isVideoEnabled, isScreenSharing, handRaised, chatOpen, participantsOpen, unreadCount, captionsEnabled, noiseSuppression, onToggleAudio, onToggleVideo, onToggleScreenShare, onToggleHandRaise, onToggleChat, onToggleParticipants, onToggleCaptions, onToggleNoiseSuppression, onSendReaction, onCopyLink, onLeave }) => {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleCopyLink = () => {
    onCopyLink();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const reactions = ['👍', '❤️', '😂', '😮', '👏', '🎉'];

  return (
    <div className="control-bar-advanced">
      <div className="control-pill-advanced">
        <button className={`control-btn-advanced ${!isAudioEnabled ? 'active-danger' : ''}`} onClick={onToggleAudio} aria-label={isAudioEnabled ? 'Mute' : 'Unmute'} title={isAudioEnabled ? 'Mute' : 'Unmute'}>
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button className={`control-btn-advanced ${!isVideoEnabled ? 'active-danger' : ''}`} onClick={onToggleVideo} aria-label={isVideoEnabled ? 'Stop video' : 'Start video'} title={isVideoEnabled ? 'Stop video' : 'Start video'}>
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <div className="control-divider-advanced" />

        <button className={`control-btn-advanced ${isScreenSharing ? 'active-primary' : ''}`} onClick={onToggleScreenShare} aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
          {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </button>

        <button className={`control-btn-advanced ${handRaised ? 'active-warning' : ''}`} onClick={onToggleHandRaise} aria-label={handRaised ? 'Lower hand' : 'Raise hand'} title={handRaised ? 'Lower hand' : 'Raise hand'}>
          <Hand size={20} />
        </button>

        <div className="control-divider-advanced" />

        <div className="control-reactions-advanced">
          <button className="control-btn-advanced" onClick={() => setShowReactions(!showReactions)} aria-label="Reactions" title="Reactions">
            <Smile size={20} />
          </button>
          {showReactions && (
            <div className="reactions-popup-advanced">
              {reactions.map(r => (
                <button key={r} className="reaction-btn-advanced" onClick={() => { onSendReaction(r); setShowReactions(false); }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className={`control-btn-advanced ${chatOpen ? 'active-primary' : ''}`} onClick={onToggleChat} aria-label="Chat" title="Chat">
          <MessageSquare size={20} />
          {unreadCount > 0 && <span className="unread-badge-advanced">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>

        <button className={`control-btn-advanced ${participantsOpen ? 'active-primary' : ''}`} onClick={onToggleParticipants} aria-label="Participants" title="Participants">
          <Users size={20} />
        </button>

        <div className="control-divider-advanced" />

        <div className="control-more-advanced">
          <button className="control-btn-advanced" onClick={() => setShowMore(!showMore)} aria-label="More options" title="More options">
            <MoreVertical size={20} />
          </button>
          {showMore && (
            <div className="more-popup-advanced">
              <button className="more-item-advanced" onClick={() => { onToggleCaptions(); setShowMore(false); }}>
                <Subtitles size={18} />
                <span>{captionsEnabled ? 'Hide' : 'Show'} captions</span>
              </button>
              <button className="more-item-advanced" onClick={() => { onToggleNoiseSuppression(); setShowMore(false); }}>
                {noiseSuppression ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span>{noiseSuppression ? 'Disable' : 'Enable'} noise suppression</span>
              </button>
              <button className="more-item-advanced" onClick={() => { handleCopyLink(); setShowMore(false); }}>
                {copyFeedback ? <Check size={18} /> : <Link2 size={18} />}
                <span>{copyFeedback ? 'Copied!' : 'Copy link'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="control-divider-advanced" />

        <button className="control-btn-advanced leave-btn-advanced" onClick={onLeave} aria-label="Leave meeting" title="Leave meeting">
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
