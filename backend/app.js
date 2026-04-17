require('dotenv').config({ path: './.env' });

const express = require('express');
const cors = require('cors');
const http = require('http');
const SocketService = require('./services/socketService');


const authRoutes = require('./routes/authRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const securityRoutes = require('./routes/securityRoutes');
const authMiddleware = require('./middleware/auth');


const app = express();

// Middleware
app.use(cors()); // Allow frontend to access API
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse form data


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api', securityRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const socketService = new SocketService(server);

// Make socket service available globally (optional)
app.set('socketService', socketService);


// Protected test route - to demonstrate how auth middleware works
app.get('/api/profile', authMiddleware.verifyToken, (req, res) => {
    res.json({
        message: 'This is a protected route',
        user: req.user  // From middleware
    });
});

// Basic test route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Meeting App API' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
     console.log(`Socket.IO ready for connections`);
});

