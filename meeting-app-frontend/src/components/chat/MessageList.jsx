import React, { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './Chat.css';

const MessageList = ({ messages, currentUser, typingUsers }) => {
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatMessageTime = (timestamp) => {
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch (error) {
            return 'recently';
        }
    };

    const isSystemMessage = (message) => {
        return message.userId === 'system' || message.type === 'system';
    };

    const isOwnMessage = (message) => {
        return message.userId === currentUser?.id;
    };

    return (
        <div className="message-list">
            {messages.length === 0 ? (
                <div className="no-messages">
                    <div className="no-messages-icon">💬</div>
                    <p>No messages yet</p>
                    <small>Be the first to send a message!</small>
                </div>
            ) : (
                <>
                    {messages.map((message, index) => (
                        <div
                            key={message.id || index}
                            className={`message-item ${
                                isSystemMessage(message) 
                                    ? 'system-message' 
                                    : isOwnMessage(message)
                                    ? 'own-message'
                                    : 'other-message'
                            }`}
                        >
                            {!isSystemMessage(message) && !isOwnMessage(message) && (
                                <div className="message-avatar">
                                    {message.userEmail?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                            
                            <div className="message-content-wrapper">
                                {!isSystemMessage(message) && !isOwnMessage(message) && (
                                    <div className="message-sender">
                                        {message.userEmail || 'Unknown User'}
                                    </div>
                                )}
                                
                                <div className="message-bubble">
                                    <div className="message-text">{message.message}</div>
                                    <div className="message-time">
                                        {formatMessageTime(message.timestamp)}
                                    </div>
                                </div>
                            </div>

                            {isOwnMessage(message) && !isSystemMessage(message) && (
                                <div className="message-status">
                                    {message.status === 'sent' && '✓'}
                                    {message.status === 'delivered' && '✓✓'}
                                    {message.status === 'read' && '✓✓'}
                                </div>
                            )}
                        </div>
                    ))}
                </>
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
                <div className="typing-indicator">
                    <div className="typing-avatars">
                        {typingUsers.slice(0, 3).map(user => (
                            <div key={user.userId} className="typing-avatar">
                                {user.userEmail?.[0]?.toUpperCase()}
                            </div>
                        ))}
                    </div>
                    <div className="typing-text">
                        {typingUsers.length === 1
                            ? `${typingUsers[0].userEmail} is typing`
                            : typingUsers.length === 2
                            ? `${typingUsers[0].userEmail} and ${typingUsers[1].userEmail} are typing`
                            : 'Several people are typing'}
                        <span className="typing-dots">
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                        </span>
                    </div>
                </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;