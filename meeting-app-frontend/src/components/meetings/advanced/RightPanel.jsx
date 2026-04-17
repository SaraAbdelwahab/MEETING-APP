import React, { useState, useEffect, useRef } from 'react';
import { X, Search, MicOff, VideoOff, Hand, Volume2 } from 'lucide-react';

const RightPanel = ({ type, messages, participants, raisedHands, activeSpeaker, typingUsers, currentUserId, isHost, onSendMessage, onTyping, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const filteredParticipants = participants.filter(p => p.username?.toLowerCase().includes(searchQuery.toLowerCase()));
  const raisedHandParticipants = filteredParticipants.filter(p => p.handRaised);
  const otherParticipants = filteredParticipants.filter(p => !p.handRaised);

  return (
    <div className="right-panel-advanced">
      <div className="panel-header-advanced">
        <h2 className="panel-title-advanced">{type === 'chat' ? 'Chat' : 'Participants'} {type === 'participants' && `(${participants.length})`}</h2>
        <button className="panel-close-advanced" onClick={onClose} aria-label="Close panel"><X size={20} /></button>
      </div>

      {type === 'chat' && (
        <>
          <div className="chat-messages-advanced">
            {messages.length === 0 ? (
              <div className="chat-empty-advanced"><p>No messages yet. Start the conversation!</p></div>
            ) : (
              messages.map((msg, idx) => {
                const isOwn = msg.userId === currentUserId;
                const isSystem = msg.type === 'system';
                if (isSystem) return <div key={idx} className="chat-message-advanced system-message-advanced"><span>{msg.text || msg.message}</span></div>;
                return (
                  <div key={idx} className={`chat-message-advanced ${isOwn ? 'own-message-advanced' : 'other-message-advanced'}`}>
                    <div className="message-header-advanced">
                      <span className="message-sender-advanced">{msg.username || msg.userEmail}</span>
                      <span className="message-time-advanced">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="message-text-advanced">{msg.text || msg.message}</div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          {typingUsers.size > 0 && (
            <div className="typing-indicator-advanced">{Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...</div>
          )}
          <form className="chat-composer-advanced" onSubmit={handleSubmit}>
            <input type="text" className="chat-input-advanced" placeholder="Type a message..." value={inputValue} onChange={(e) => { setInputValue(e.target.value); onTyping(); }} maxLength={500} />
            <button type="submit" className="chat-send-advanced" disabled={!inputValue.trim()}>Send</button>
          </form>
        </>
      )}

      {type === 'participants' && (
        <>
          <div className="participant-search-advanced">
            <Search size={16} className="search-icon-advanced" />
            <input type="text" className="search-input-advanced" placeholder="Search participants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="participant-list-advanced">
            {raisedHandParticipants.length > 0 && (
              <div className="participant-section-advanced">
                <h3 className="section-title-advanced">Raised Hands ({raisedHandParticipants.length})</h3>
                {raisedHandParticipants.map(p => (
                  <div key={p.userId} className="participant-item-advanced raised-hand-item-advanced">
                    <div className="participant-avatar-advanced" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{p.username?.charAt(0).toUpperCase()}</div>
                    <div className="participant-info-advanced">
                      <span className="participant-name-advanced">{p.username} {p.userId === currentUserId && '(You)'}</span>
                      <div className="participant-status-advanced">
                        {!p.isAudioEnabled && <MicOff size={14} />}
                        {!p.isVideoEnabled && <VideoOff size={14} />}
                      </div>
                    </div>
                    <Hand size={16} className="hand-icon-advanced" />
                  </div>
                ))}
              </div>
            )}
            {activeSpeaker && (
              <div className="participant-section-advanced">
                <h3 className="section-title-advanced">Currently Speaking</h3>
                {otherParticipants.filter(p => p.userId === activeSpeaker).map(p => (
                  <div key={p.userId} className="participant-item-advanced speaking-item-advanced">
                    <div className="participant-avatar-advanced" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{p.username?.charAt(0).toUpperCase()}</div>
                    <div className="participant-info-advanced">
                      <span className="participant-name-advanced">{p.username}</span>
                    </div>
                    <Volume2 size={16} className="speaking-icon-advanced" />
                  </div>
                ))}
              </div>
            )}
            <div className="participant-section-advanced">
              <h3 className="section-title-advanced">All Participants</h3>
              {otherParticipants.length === 0 ? (
                <p className="no-results-advanced">No participants found</p>
              ) : (
                otherParticipants.map(p => (
                  <div key={p.userId} className="participant-item-advanced">
                    <div className="participant-avatar-advanced" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{p.username?.charAt(0).toUpperCase()}</div>
                    <div className="participant-info-advanced">
                      <span className="participant-name-advanced">{p.username} {p.userId === currentUserId && '(You)'}</span>
                      <div className="participant-status-advanced">
                        {!p.isAudioEnabled && <MicOff size={14} />}
                        {!p.isVideoEnabled && <VideoOff size={14} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RightPanel;
