console.log('--- Starting middleware/auth.js execution ---');

const jwt = require('jsonwebtoken');
console.log('jwt imported.');

const { User } = require('../models');
console.log('User model imported.');

const logger = require('../utils/logger');
console.log('logger imported.');

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists and is active
        const user = await User.findById(decoded.userId).select('-password -refreshTokens');
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found or inactive.'
            });
        }

        // Add user info to request
        req.user = {
            userId: user._id,
            email: user.email,
            role: user.role,
            name: user.name
        };

        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed.'
        });
    }
};

// Authorization middleware - check user roles
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions.'
            });
        }

        next();
    };
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -refreshTokens');
        
        if (user && user.isActive) {
            req.user = {
                userId: user._id,
                email: user.email,
                role: user.role,
                name: user.name
            };
        }

        next();
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

console.log('Auth, authorize, optionalAuth functions defined.');

module.exports = {
    auth,
    authorize,
    optionalAuth
};
console.log('--- End of middleware/auth.js execution ---');
