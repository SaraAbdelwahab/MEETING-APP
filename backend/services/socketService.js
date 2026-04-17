const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const auditStore = require('./auditStore');
const { AUDIT_EVENTS } = require('./auditStore');
const deviceBindingService = require('./deviceBindingService');
const { DeviceMismatchError } = require('./deviceBindingService');
const identityService = require('./identityService');
const handoffService = require('./handoffService');

// Store active users in meetings
const meetingUsers = new Map(); // meetingId -> Set of userIds
const userSockets = new Map(); // userId -> socketId
// Track which sockets are shadow sessions: socketId -> { userId, meetingId }
const shadowSocketMap = new Map();

class SocketService {
    constructor(server) {
        this.io = socketIo(server, {
            cors: {
                origin: ["http://localhost:3000", "http://localhost:5173"], // Support both ports
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        console.log('✅ Socket.IO initialized with CORS for localhost:5173');

        // Authentication middleware
        this.io.use(this.authenticateSocket);

        // Connection handler
        this.io.on('connection', this.handleConnection.bind(this));

        // Share IO instance with new services
        identityService.setIO(this.io);
        handoffService.setIO(this.io);
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

        // Handle hand raise
        socket.on('hand-raise', (data) => this.handleHandRaise(socket, data));

        // WebRTC signaling events
        socket.on('join-call', (data) => this.handleJoinCall(socket, data));
        socket.on('send-offer', (data) => this.handleWebRTCSignal(socket, data, 'offer'));
        socket.on('send-answer', (data) => this.handleWebRTCSignal(socket, data, 'answer'));
        socket.on('ice-candidate', (data) => this.handleWebRTCSignal(socket, data, 'ice-candidate'));

        // Secure session events
        socket.on('secure:session-ready', (data) => this.handleSecureSessionReady(socket, data));
        socket.on('secure:rekey-confirm', (data) => this.handleRekeyConfirm(socket, data));

        // Identity / biometric presence events
        socket.on('presence:token', (data) => this.handlePresenceToken(socket, data));

        // Handoff / continuity events
        socket.on('handoff:register-shadow', (data) => this.handleRegisterShadow(socket, data));
        socket.on('handoff:request', (data) => this.handleHandoffRequest(socket, data));
        socket.on('handoff:snapshot', (data) => this.handleHandoffSnapshot(socket, data));

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

        // Filter out shadow socket IDs from online users list
        const shadowIds = new Set();
        for (const [sid, info] of shadowSocketMap.entries()) {
            if (info.meetingId === meetingId) shadowIds.add(info.userId);
        }
        const filteredOnlineUsers = usersInMeeting.filter(uid => !shadowIds.has(uid) || uid === socket.userId);

        socket.emit('meeting-participants', {
            meetingId,
            participants,
            onlineUsers: filteredOnlineUsers
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

    // Handle hand raise
    handleHandRaise(socket, data) {
        const { meetingId, raised } = data;
        
        if (!meetingId) return;

        // Broadcast to everyone in the meeting (including sender for confirmation)
        this.io.to(`meeting:${meetingId}`).emit('hand-raise', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            raised: raised,
            meetingId
        });

        console.log(`Hand raise ${raised ? 'raised' : 'lowered'} by ${socket.userEmail} in meeting ${meetingId}`);
    }

    // Handle WebRTC call join
    handleJoinCall(socket, data) {
        const { meetingId } = data;
        
        console.log(`📞 [SocketService] handleJoinCall called by ${socket.userEmail} for meeting ${meetingId}`);
        
        if (!meetingId) {
            console.error('❌ [SocketService] No meetingId provided in join-call');
            return;
        }

        console.log(`✅ [SocketService] User ${socket.userEmail} (ID: ${socket.userId}) joining call in meeting ${meetingId}`);
        console.log(`📊 [SocketService] Current userSockets size: ${userSockets.size}`);
        console.log(`📊 [SocketService] Socket ID: ${socket.id}`);

        // Notify all other users in the meeting that this user joined the call
        socket.to(`meeting:${meetingId}`).emit('user-joined-call', {
            userId: socket.userId,
            userEmail: socket.userEmail,
            meetingId
        });
        
        console.log(`📤 [SocketService] Emitted user-joined-call to meeting:${meetingId}`);

        // Also emit user-left-call when they disconnect
        socket.on('leave-call', () => {
            console.log(`📞 [SocketService] User ${socket.userEmail} leaving call in meeting ${meetingId}`);
            socket.to(`meeting:${meetingId}`).emit('user-left-call', {
                userId: socket.userId,
                userEmail: socket.userEmail,
                meetingId
            });
        });
    }

    // Handle WebRTC signaling
    handleWebRTCSignal(socket, data, type) {
        const { targetUserId, offer, answer, candidate } = data;
        
        // Find target user's socket
        const targetSocketId = userSockets.get(targetUserId);
        
        if (targetSocketId) {
            const eventName = type === 'offer' ? 'receive-offer' : 
                            type === 'answer' ? 'receive-answer' : 
                            'ice-candidate';
            
            const payload = {
                fromUserId: socket.userId,
                fromUserEmail: socket.userEmail
            };

            if (type === 'offer') payload.offer = offer;
            if (type === 'answer') payload.answer = answer;
            if (type === 'ice-candidate') payload.candidate = candidate;

            // Relay signal to specific user
            this.io.to(targetSocketId).emit(eventName, payload);
            
            console.log(`Relayed ${type} from ${socket.userEmail} to user ${targetUserId}`);
        } else {
            console.log(`Target user ${targetUserId} not found for ${type}`);
        }
    }

    // Handle disconnection
    handleDisconnect(socket) {
        console.log(`User disconnected: ${socket.userId}`);

        // Remove from userSockets
        userSockets.delete(socket.userId);

        // Check if this was a shadow session
        if (shadowSocketMap.has(socket.id)) {
            const { userId, meetingId } = shadowSocketMap.get(socket.id);
            shadowSocketMap.delete(socket.id);
            console.log(`Shadow session disconnected: user ${userId} meeting ${meetingId}`);
            return; // Don't trigger primary disconnect logic for shadows
        }

        // Remove from all meetings and notify others
        meetingUsers.forEach(async (users, meetingId) => {
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

                // Attempt hot failover to shadow session
                try {
                    const result = await handoffService.handlePrimaryDisconnect(socket.userId, meetingId);
                    if (!result.promoted) {
                        console.log(`No shadow available for user ${socket.userId} in meeting ${meetingId}`);
                    }
                } catch (err) {
                    console.error(`Handoff failed for user ${socket.userId}:`, err.message);
                }
            }
        });
    }

    // Handle secure session ready (device binding)
    async handleSecureSessionReady(socket, data) {
        const { sessionId, fingerprintComponents, meetingId } = data;
        if (!sessionId || !fingerprintComponents) return;

        try {
            const { bindingId, fingerprintHash } = await deviceBindingService.bindDevice(
                sessionId,
                socket.userId,
                fingerprintComponents,
                new Date(Date.now() + 35 * 60 * 1000) // session TTL
            );

            await auditStore.write({
                eventType: AUDIT_EVENTS.SESSION_ESTABLISHED,
                userId: socket.userId,
                meetingId: meetingId || null,
                deviceFingerprintHash: fingerprintHash,
                metadata: { sessionId, bindingId },
            });

            socket.sessionId = sessionId;
            socket.fingerprintHash = fingerprintHash;
            socket.join(`session:${sessionId}`);

            socket.emit('secure:session-ack', { sessionId, status: 'active' });
        } catch (err) {
            console.error('[SocketService] secure:session-ready error:', err.message);
            socket.emit('secure:session-error', { message: err.message });
        }
    }

    // Handle rekey confirmation from client
    handleRekeyConfirm(socket, data) {
        const { newSessionId } = data;
        if (!newSessionId) return;
        socket.join(`session:${newSessionId}`);
        if (socket.sessionId) socket.leave(`session:${socket.sessionId}`);
        socket.sessionId = newSessionId;
        console.log(`[SocketService] Rekey confirmed for user ${socket.userId}, new session: ${newSessionId}`);
    }

    // Handle biometric presence token
    async handlePresenceToken(socket, data) {
        const { deviceId, verificationToken, meetingId } = data;
        if (!deviceId || !verificationToken) return;

        try {
            const { valid } = await identityService.verifyPresenceToken(socket.userId, deviceId, verificationToken);
            if (valid) {
                identityService.resetFailureCounter(socket.userId, socket.sessionId || 'default');
            } else {
                await identityService.recordPresenceFailure(socket.userId, socket.sessionId || 'default', meetingId);
            }
        } catch (err) {
            console.error('[SocketService] presence:token error:', err.message);
            await identityService.recordPresenceFailure(socket.userId, socket.sessionId || 'default', meetingId);
        }
    }

    // Handle shadow session registration
    async handleRegisterShadow(socket, data) {
        const { meetingId, deviceFingerprint } = data;
        if (!meetingId) return;

        try {
            const { shadowSessionId } = await handoffService.registerShadow(
                socket.userId,
                meetingId,
                socket.id,
                deviceFingerprint || 'unknown'
            );

            shadowSocketMap.set(socket.id, { userId: socket.userId, meetingId });
            socket.emit('handoff:shadow-registered', { shadowSessionId });
            console.log(`Shadow registered: user ${socket.userId} meeting ${meetingId} socket ${socket.id}`);
        } catch (err) {
            socket.emit('handoff:error', { message: err.message });
        }
    }

    // Handle manual handoff request
    async handleHandoffRequest(socket, data) {
        const { targetShadowId, meetingId } = data;
        if (!targetShadowId || !meetingId) return;

        try {
            await handoffService.promote(socket.userId, meetingId, targetShadowId);
        } catch (err) {
            socket.emit('handoff:error', { message: err.message });
        }
    }

    // Handle snapshot sync from primary device
    async handleHandoffSnapshot(socket, data) {
        const { meetingId, ...snapshot } = data;
        if (!meetingId) return;

        try {
            await handoffService.syncSnapshot(socket.userId, meetingId, snapshot);
        } catch (err) {
            console.error('[SocketService] handoff:snapshot error:', err.message);
        }
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