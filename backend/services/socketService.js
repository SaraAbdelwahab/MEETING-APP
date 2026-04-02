const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// Store active users in meetings
const meetingUsers = new Map(); // meetingId -> Set of userIds
const userSockets = new Map(); // userId -> socketId

class SocketService {
    constructor(server) {
        this.io = socketIo(server, {
            cors: {
                origin: "http://localhost:3000", // Your React app URL
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        // Authentication middleware
        this.io.use(this.authenticateSocket);

        // Connection handler
        this.io.on('connection', this.handleConnection.bind(this));
    }

    // Authenticate socket connection using JWT
    authenticateSocket(socket, next) {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication required'));
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Attach user info to socket
            socket.userId = decoded.userId;
            socket.userEmail = decoded.email;
            
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    }

    // Handle new socket connection
    handleConnection(socket) {
        console.log(`User connected: ${socket.userId} (Socket: ${socket.id})`);

        // Store user's socket
        userSockets.set(socket.userId, socket.id);

        // Handle joining a meeting room
        socket.on('join-meeting', (data) => this.handleJoinMeeting(socket, data));

        // Handle leaving a meeting room
        socket.on('leave-meeting', (data) => this.handleLeaveMeeting(socket, data));

        // Handle chat messages
        socket.on('send-message', (data) => this.handleChatMessage(socket, data));

        // Handle typing indicators
        socket.on('typing', (data) => this.handleTyping(socket, data));
        socket.on('stop-typing', (data) => this.handleStopTyping(socket, data));

        // WebRTC signaling events
        socket.on('webrtc-offer', (data) => this.handleWebRTCSignal(socket, data, 'offer'));
        socket.on('webrtc-answer', (data) => this.handleWebRTCSignal(socket, data, 'answer'));
        socket.on('webrtc-ice-candidate', (data) => this.handleWebRTCSignal(socket, data, 'ice-candidate'));

        // Handle disconnection
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    // Handle user joining a meeting
    async handleJoinMeeting(socket, data) {
        const { meetingId } = data;
        
        if (!meetingId) return;

        // Join socket.io room
        socket.join(`meeting:${meetingId}`);
        
        // Add user to meeting users set
        if (!meetingUsers.has(meetingId)) {
            meetingUsers.set(meetingId, new Set());
        }
        meetingUsers.get(meetingId).add(socket.userId);

        // Get all users in this meeting
        const usersInMeeting = Array.from(meetingUsers.get(meetingId));

        // Notify others in the meeting that user joined
        socket.to(`meeting:${meetingId}`).emit('user-joined', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            meetingId: meetingId,
            timestamp: new Date().toISOString()
        });

        // Send current participants to the joining user
        const participants = await this.getMeetingParticipants(meetingId);
        socket.emit('meeting-participants', {
            meetingId,
            participants,
            onlineUsers: usersInMeeting
        });

        // Send system message about user joining
        this.io.to(`meeting:${meetingId}`).emit('receive-message', {
            id: Date.now().toString(),
            meetingId,
            userId: 'system',
            userEmail: 'System',
            message: `${socket.userEmail} joined the meeting`,
            timestamp: new Date().toISOString(),
            type: 'system'
        });

        console.log(`User ${socket.userId} joined meeting ${meetingId}`);
    }

    // Handle user leaving a meeting
    handleLeaveMeeting(socket, data) {
        const { meetingId } = data;
        
        if (!meetingId) return;

        // Leave socket.io room
        socket.leave(`meeting:${meetingId}`);
        
        // Remove user from meeting users set
        if (meetingUsers.has(meetingId)) {
            meetingUsers.get(meetingId).delete(socket.userId);
            
            // Clean up empty meeting
            if (meetingUsers.get(meetingId).size === 0) {
                meetingUsers.delete(meetingId);
            }
        }

        // Notify others
        socket.to(`meeting:${meetingId}`).emit('user-left', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            meetingId: meetingId,
            timestamp: new Date().toISOString()
        });

        // Send system message
        this.io.to(`meeting:${meetingId}`).emit('receive-message', {
            id: Date.now().toString(),
            meetingId,
            userId: 'system',
            userEmail: 'System',
            message: `${socket.userEmail} left the meeting`,
            timestamp: new Date().toISOString(),
            type: 'system'
        });
    }

    // Handle chat messages
    handleChatMessage(socket, data) {
        const { meetingId, message } = data;
        
        if (!meetingId || !message) return;

        const messageData = {
            id: Date.now().toString(),
            meetingId,
            userId: socket.userId,
            userEmail: socket.userEmail,
            message: message,
            timestamp: new Date().toISOString(),
            type: 'user'
        };

        // Broadcast to everyone in the meeting (including sender)
        this.io.to(`meeting:${meetingId}`).emit('receive-message', messageData);

        console.log(`Chat message in meeting ${meetingId} from ${socket.userEmail}`);
    }

    // Handle typing indicators
    handleTyping(socket, data) {
        const { meetingId } = data;
        
        socket.to(`meeting:${meetingId}`).emit('user-typing', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            meetingId
        });
    }

    handleStopTyping(socket, data) {
        const { meetingId } = data;
        
        socket.to(`meeting:${meetingId}`).emit('user-stop-typing', {
            userId: socket.userId,
            meetingId
        });
    }

    // Handle WebRTC signaling
    handleWebRTCSignal(socket, data, type) {
        const { meetingId, targetUserId, signal } = data;
        
        // Find target user's socket
        const targetSocketId = userSockets.get(targetUserId);
        
        if (targetSocketId) {
            // Relay signal to specific user
            this.io.to(targetSocketId).emit(`webrtc-${type}`, {
                fromUserId: socket.userId,
                fromUserEmail: socket.userEmail,
                meetingId,
                signal
            });
        }
    }

    // Handle disconnection
    handleDisconnect(socket) {
        console.log(`User disconnected: ${socket.userId}`);

        // Remove from userSockets
        userSockets.delete(socket.userId);

        // Remove from all meetings and notify others
        meetingUsers.forEach((users, meetingId) => {
            if (users.has(socket.userId)) {
                users.delete(socket.userId);
                
                // Notify others in the meeting
                this.io.to(`meeting:${meetingId}`).emit('user-left', {
                    userId: socket.userId,
                    userEmail: socket.userEmail,
                    meetingId,
                    timestamp: new Date().toISOString()
                });

                // Send system message
                this.io.to(`meeting:${meetingId}`).emit('receive-message', {
                    id: Date.now().toString(),
                    meetingId,
                    userId: 'system',
                    userEmail: 'System',
                    message: `${socket.userEmail} disconnected`,
                    timestamp: new Date().toISOString(),
                    type: 'system'
                });
            }
        });
    }

    // Helper: Get meeting participants from database
    async getMeetingParticipants(meetingId) {
        try {
            const db = require('../config/database');
            const query = `
                SELECT u.id, u.name, u.email
                FROM meeting_participants mp
                JOIN users u ON mp.user_id = u.id
                WHERE mp.meeting_id = ?
            `;
            const [rows] = await db.query(query, [meetingId]);
            return rows;
        } catch (error) {
            console.error('Error fetching participants:', error);
            return [];
        }
    }

    // Helper: Send notification to a specific user
    sendToUser(userId, event, data) {
        const socketId = userSockets.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }

    // Helper: Broadcast to meeting room
    broadcastToMeeting(meetingId, event, data) {
        this.io.to(`meeting:${meetingId}`).emit(event, data);
    }
}

module.exports = SocketService;