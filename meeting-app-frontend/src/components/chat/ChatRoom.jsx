import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './Chat.css';

const ChatRoom = ({ meetingId, isParticipant }) => {
    const { user } = useAuth();
    const {
        connected,
        onlineUsers,
        joinMeeting,
        leaveMeeting,
        sendMessage,
        sendTyping,
        sendStopTyping,
        onMessage,
        onTyping,
        onStopTyping,
        offMessage,
        offTyping
    } = useSocket();

    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [error, setError] = useState('');

    // Load any existing messages (you can add API call here for message history)
    useEffect(() => {
        // You can fetch message history from your backend here
        // For now, we'll start with an empty array
        setMessages([]);
    }, [meetingId]);

    // Join meeting room when component mounts
    useEffect(() => {
        if (meetingId && isParticipant && connected) {
            joinMeeting(meetingId);

            // Add system message when joining
            const joinMessage = {
                id: `system-${Date.now()}`,
                meetingId,
                userId: 'system',
                userEmail: 'System',
                message: 'You joined the meeting',
                timestamp: new Date().toISOString(),
                type: 'system'
            };
            setMessages(prev => [...prev, joinMessage]);

            return () => {
                leaveMeeting(meetingId);
                
                // Add system message when leaving
                const leaveMessage = {
                    id: `system-${Date.now()}`,
                    meetingId,
                    userId: 'system',
                    userEmail: 'System',
                    message: 'You left the meeting',
                    timestamp: new Date().toISOString(),
                    type: 'system'
                };
                setMessages(prev => [...prev, leaveMessage]);
            };
        }
    }, [meetingId, isParticipant, connected]);

    // Listen for incoming messages
    useEffect(() => {
        const handleNewMessage = (message) => {
            setMessages(prev => [...prev, message]);
        };

        onMessage(handleNewMessage);

        return () => {
            offMessage();
        };
    }, [onMessage, offMessage]);

    // Listen for typing indicators
    useEffect(() => {
        const handleTyping = (data) => {
            if (data.userId !== user?.id) {
                setTypingUsers(prev => {
                    // Check if user is already in typing list
                    const exists = prev.some(u => u.userId === data.userId);
                    if (!exists) {
                        return [...prev, { userId: data.userId, userEmail: data.userEmail }];
                    }
                    return prev;
                });
            }
        };

        const handleStopTyping = (data) => {
            setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        };

        onTyping(handleTyping);
        onStopTyping(handleStopTyping);

        return () => {
            offTyping();
        };
    }, [user, onTyping, onStopTyping]);

    // Clear typing users when they disconnect
    useEffect(() => {
        setTypingUsers(prev => 
            prev.filter(u => onlineUsers.includes(u.userId))
        );
    }, [onlineUsers]);

    const handleSendMessage = useCallback((message) => {
        const success = sendMessage(meetingId, message);
        
        if (success) {
            // Optimistically add message to UI
            const tempMessage = {
                id: `temp-${Date.now()}`,
                meetingId,
                userId: user?.id,
                userEmail: user?.email,
                message,
                timestamp: new Date().toISOString(),
                status: 'sent'
            };
            setMessages(prev => [...prev, tempMessage]);
        } else {
            setError('Failed to send message. Please try again.');
            setTimeout(() => setError(''), 3000);
        }
    }, [meetingId, sendMessage, user]);

    const handleTyping = useCallback(() => {
        sendTyping(meetingId);
    }, [meetingId, sendTyping]);

    const handleStopTyping = useCallback(() => {
        sendStopTyping(meetingId);
    }, [meetingId, sendStopTyping]);

    if (!isParticipant) {
        return (
            <div className="chat-room disabled">
                <div className="chat-header">
                    <h3>Meeting Chat</h3>
                    <div className="connection-status disconnected">
                        <span className="status-dot"></span>
                        Not a participant
                    </div>
                </div>
                <div className="chat-disabled-message">
                    <p>You need to be a participant to access the chat</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-room">
            <div className="chat-header">
                <h3>Meeting Chat</h3>
                <div className="chat-header-right">
                    <div className="online-count">
                        <span className="online-dot"></span>
                        {onlineUsers.length} online
                    </div>
                    <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
            </div>

            {error && (
                <div className="chat-error">
                    {error}
                </div>
            )}

            <MessageList
                messages={messages}
                currentUser={user}
                typingUsers={typingUsers}
            />

            <MessageInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
                disabled={!connected}
            />
        </div>
    );
};

export default ChatRoom;