import React, { useState, useEffect, useRef } from 'react';

const ChatPanel = ({
  messages,
  onSendMessage,
  onTyping,
  typingUsers,
  currentUserId,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onTyping();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="chat-panel" role="complementary" aria-label="Chat">
      <div className="panel-header">
        <h2 className="panel-title">Chat</h2>
        <button
          className="panel-close"
          onClick={onClose}
          aria-label="Close chat panel"
        >
          ✕
        </button>
      </div>

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.userId === currentUserId;
            const isSystem = msg.type === 'system';

            if (isSystem) {
              return (
                <div key={index} className="chat-message system-message">
                  <span className="message-text">{msg.text || msg.message}</span>
                </div>
              );
            }

            return (
              <div
                key={index}
                className={`chat-message ${isOwn ? 'own-message' : 'other-message'}`}
              >
                <div className="message-header">
                  <span className="message-sender">{msg.username || msg.userEmail}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-text">{msg.text || msg.message}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.size > 0 && (
        <div className="typing-indicator" role="status" aria-live="polite">
          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'}{' '}
          typing...
        </div>
      )}

      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleInputChange}
          aria-label="Message input"
          maxLength={500}
        />
        <button
          type="submit"
          className="chat-send"
          disabled={!inputValue.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
