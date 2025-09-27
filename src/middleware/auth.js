const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware
 * Demonstrates JWT-based authentication middleware
 */
const authMiddleware = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No token provided. Include Authorization header with Bearer token.',
                example: 'Authorization: Bearer <your-jwt-token>'
            });
        }

        // Extract token from "Bearer <token>" format
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                error: 'Invalid token format',
                message: 'Token must be in format: Bearer <token>'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Add user info to request object
        req.user = decoded;
        
        console.log(`🔐 Authenticated user: ${decoded.username} (ID: ${decoded.userId})`);
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please login again to get a new token'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token is malformed or invalid'
            });
        }
        
        return res.status(500).json({
            error: 'Authentication error',
            message: 'An error occurred during authentication'
        });
    }
};

/**
 * Generate JWT token for testing
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user.id,
            username: user.username,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't require it
 */
const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication for optional middleware
        next();
    }
};

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    generateToken,
    JWT_SECRET
};