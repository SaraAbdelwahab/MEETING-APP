import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

// ✅ Export the context
export const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        if (isAuthenticated && user) {
            connectSocket();
        } else {
            disconnectSocket();
        }

        return () => {
            disconnectSocket();
        };
    }, [isAuthenticated, user]);

    const connectSocket = () => {
        if (socketRef.current?.connected) return;

        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        const token = localStorage.getItem('token');

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('🔌 Socket connected:', newSocket.id);
            setConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            setConnected(false);
            setOnlineUsers([]);
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
            setConnected(false);
        });

        newSocket.on('meeting-participants', (data) => {
            console.log('👥 Online users in meeting:', data.onlineUsers);
            setOnlineUsers(data.onlineUsers);
        });

        newSocket.on('user-joined', (data) => {
            console.log('👤 User joined:', data.userEmail);
            setOnlineUsers(prev => [...prev, data.userId]);
        });

        newSocket.on('user-left', (data) => {
            console.log('👤 User left:', data.userEmail);
            setOnlineUsers(prev => prev.filter(id => id !== data.userId));
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
        });

        newSocket.on('reconnect_error', (error) => {
            console.error('❌ Socket reconnection error:', error);
        });

        newSocket.on('user-joined-call', (data) => {
            console.log('📞 User joined call:', data);
        });

        newSocket.on('receive-offer', (data) => {
            console.log('📞 Received offer from:', data.fromUserId);
        });

        newSocket.on('receive-answer', (data) => {
            console.log('📞 Received answer from:', data.fromUserId);
        });

        newSocket.on('ice-candidate', (data) => {
            console.log('📞 Received ICE candidate from:', data.fromUserId);
        });

        newSocket.on('user-left-call', (data) => {
            console.log('📞 User left call:', data.userId);
        });
    };

    const disconnectSocket = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setConnected(false);
            setOnlineUsers([]);
        }
    };

    const joinMeeting = (meetingId) => {
        if (socketRef.current?.connected && meetingId) {
            socketRef.current.emit('join-meeting', { meetingId: parseInt(meetingId) });
            console.log(`📥 Joined meeting room: ${meetingId}`);
        }
    };

    const leaveMeeting = (meetingId) => {
        if (socketRef.current?.connected && meetingId) {
            socketRef.current.emit('leave-meeting', { meetingId: parseInt(meetingId) });
            console.log(`📤 Left meeting room: ${meetingId}`);
        }
    };

    const sendMessage = (meetingId, message) => {
        if (socketRef.current?.connected && meetingId && message.trim()) {
            socketRef.current.emit('send-message', {
                meetingId: parseInt(meetingId),
                message: message.trim()
            });
            return true;
        }
        return false;
    };

    const sendTyping = (meetingId) => {
        if (socketRef.current?.connected && meetingId) {
            socketRef.current.emit('typing', { meetingId: parseInt(meetingId) });
        }
    };

    const sendStopTyping = (meetingId) => {
        if (socketRef.current?.connected && meetingId) {
            socketRef.current.emit('stop-typing', { meetingId: parseInt(meetingId) });
        }
    };

    const onMessage = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('receive-message', callback);
        }
    };

    const onTyping = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('user-typing', callback);
        }
    };

    const onStopTyping = (callback) => {
        if (socketRef.current) {
            socketRef.current.on('user-stop-typing', callback);
        }
    };

    const offMessage = () => {
        if (socketRef.current) {
            socketRef.current.off('receive-message');
        }
    };

    const offTyping = () => {
        if (socketRef.current) {
            socketRef.current.off('user-typing');
            socketRef.current.off('user-stop-typing');
        }
    };

    const emit = (event, data) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
            return true;
        }
        console.warn(`Cannot emit ${event}: socket not connected`);
        return false;
    };

    const on = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
            return true;
        }
        return false;
    };

    const off = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
            return true;
        }
        return false;
    };

    const value = {
        socket,
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
        offTyping,
        emit,
        on,
        off
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};