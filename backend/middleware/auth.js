const jwt = require('jsonwebtoken');

const authMiddleware = {
    // Verify JWT token
    verifyToken(req, res, next) {
        try {
            // Get token from header (format: "Bearer <token>")
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ 
                    message: 'No token provided' 
                });
            }

            // Extract token (remove "Bearer " prefix)
            const token = authHeader.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Add user info to request object
            req.user = {
                userId: decoded.userId,
                email: decoded.email
            };

            next(); // Proceed to next middleware/route handler

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token expired' 
                });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    message: 'Invalid token' 
                });
            }
            console.error('Auth middleware error:', error);
            res.status(500).json({ 
                message: 'Authentication error' 
            });
        }
    }
};

module.exports = authMiddleware;