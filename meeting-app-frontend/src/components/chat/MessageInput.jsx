import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';

const MessageInput = ({ onSendMessage, onTyping, onStopTyping, disabled }) => {
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // Focus input when component mounts
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        // Handle typing indicators
        if (value.trim() && !isTyping) {
            setIsTyping(true);
            onTyping();
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout for stop typing
        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) {
                setIsTyping(false);
                onStopTyping();
            }
        }, 1000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');
            
            // Reset typing indicator
            if (isTyping) {
                setIsTyping(false);
                onStopTyping();
            }
            
            // Clear typing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            // Keep focus on input after sending
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="message-input-form" onSubmit={handleSubmit}>
            <div className="input-container">
                <input
                    ref={inputRef}
                    type="text"
                    className="message-input"
                    value={message}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    placeholder={disabled ? "Join the meeting to chat" : "Type a message..."}
                    disabled={disabled}
                    autoComplete="off"
                />
                
                <button
                    type="submit"
                    className="send-button"
                    disabled={!message.trim() || disabled}
                >
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path
                            fill="currentColor"
                            d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                        />
                    </svg>
                </button>
            </div>
            
            {disabled && (
                <div className="input-hint">
                    You need to be in the meeting to send messages
                </div>
            )}
        </form>
    );
};

export default MessageInput;