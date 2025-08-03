const winston = require('winston');
const path = require('path');

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        if (stack) {
            return `${timestamp} [${level}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level}]: ${message}`;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    defaultMeta: { service: 'inoxdev-backend' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: fileFormat
        }),
        
        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: fileFormat
        }),

        // Access log file (replaced DailyRotateFile)
        new winston.transports.File({
            filename: path.join(logsDir, 'access.log'),
            level: 'http',
            maxsize: 20971520, // 20MB
            maxFiles: 14,
            format: fileFormat
        })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// Create a stream object for Morgan HTTP request logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Add custom logging methods for different contexts
logger.addContext = (context) => {
    return logger.child({ context });
};

// Security logging
logger.security = (message, meta = {}) => {
    logger.warn(`[SECURITY] ${message}`, {
        ...meta,
        timestamp: new Date().toISOString(),
        type: 'security'
    });
};

// Database logging
logger.database = (message, meta = {}) => {
    logger.info(`[DATABASE] ${message}`, {
        ...meta,
        timestamp: new Date().toISOString(),
        type: 'database'
    });
};

// API logging
logger.api = (message, meta = {}) => {
    logger.info(`[API] ${message}`, {
        ...meta,
        timestamp: new Date().toISOString(),
        type: 'api'
    });
};

// Email logging
logger.email = (message, meta = {}) => {
    logger.info(`[EMAIL] ${message}`, {
        ...meta,
        timestamp: new Date().toISOString(),
        type: 'email'
    });
};

// Performance logging
logger.performance = (message, duration, meta = {}) => {
    logger.info(`[PERFORMANCE] ${message}`, {
        ...meta,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        type: 'performance'
    });
};

// User action logging
logger.userAction = (userId, action, meta = {}) => {
    logger.info(`[USER_ACTION] User ${userId} performed: ${action}`, {
        ...meta,
        userId,
        action,
        timestamp: new Date().toISOString(),
        type: 'user_action'
    });
};

module.exports = logger;