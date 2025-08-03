const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('./utils/logger');
const os = require('os');
const fs = require('fs');

console.log('--- Starting server.js execution ---');

// Load environment variables
try {
    dotenv.config();
    console.log('Environment variables loaded.');
} catch (error) {
    console.error('Error loading environment variables:', error);
    process.exit(1); // Exit if .env loading fails
}

// Function to get local IP address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return '192.168.1.13'; // fallback
}

const localIP = getLocalIPAddress();
console.log(`Local IP Address detected: ${localIP}`);

// Global unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message, err.stack);
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

// Import routes
console.log('Attempting to import contactRoutes...');
const contactRoutes = require('./routes/contact');
console.log('contactRoutes imported.');

console.log('Attempting to import authRoutes...');
const authRoutes = require('./routes/auth');
console.log('authRoutes imported.');

console.log('Attempting to import projectRoutes...');
const projectRoutes = require('./routes/projects');
console.log('projectRoutes imported.');

console.log('Attempting to import serviceRoutes...');
const serviceRoutes = require('./routes/services');
console.log('serviceRoutes imported.');

console.log('Attempting to import teamRoutes...');
const teamRoutes = require('./routes/team');
console.log('teamRoutes imported.');

console.log('Attempting to import testimonialRoutes...');
const testimonialRoutes = require('./routes/testimonials');
console.log('testimonialRoutes imported.');

console.log('Attempting to import newsletterRoutes...');
const newsletterRoutes = require('./routes/newsletter');
console.log('newsletterRoutes imported.');

console.log('Attempting to import analyticsRoutes...');
const analyticsRoutes = require('./routes/analytics');
console.log('analyticsRoutes imported.');

// Import middleware
console.log('Attempting to import errorHandler...');
const { errorHandler } = require('./middleware/errorHandler');
console.log('errorHandler imported. Type of errorHandler:', typeof errorHandler);

const app = express();
const PORT = process.env.PORT || 5000;

console.log(`Server will attempt to run on port: ${PORT}`);
console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`MongoDB URI: ${process.env.MONGODB_URI ? '***** (set)' : 'Not set, using default'}`);

// DEBUGGING MIDDLEWARE - Add this FIRST to log all requests
app.use((req, res, next) => {
    console.log(`\n=== REQUEST DEBUG ===`);
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    console.log(`Host: ${req.get('host')}`);
    console.log(`Origin: ${req.get('origin') || 'Direct'}`);
    console.log(`User-Agent: ${req.get('user-agent')}`);
    console.log(`Protocol: ${req.protocol} (Secure: ${req.secure})`);
    console.log(`IP: ${req.ip}`);
    console.log(`===================\n`);
    next();
});

// SIMPLIFIED HELMET CONFIG for debugging - Disable CSP temporarily
app.use(helmet({
    contentSecurityPolicy: false, // DISABLED for debugging
    crossOriginEmbedderPolicy: false
}));
console.log('Simplified Helmet middleware applied (CSP disabled for debugging).');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 contact form submissions per hour
    message: {
        error: 'Too many contact form submissions, please try again later.'
    }
});

app.use('/api/', limiter);
app.use('/api/contact', contactLimiter);
console.log('Rate limiting applied.');

// Middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Enhanced CORS configuration with automatic IPv4 detection
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    `http://${localIP}:5000`,
    'http://192.168.1.13:5000', // Keep your original IP as fallback
    // Add common local network patterns
    'http://192.168.1.1:5000',
    'http://192.168.0.1:5000',
    'http://10.0.0.1:5000'
].filter(Boolean);

console.log('Allowed CORS Origins:', allowedOrigins);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        
        // Allow any localhost or local IP origins for development
        if (process.env.NODE_ENV !== 'production') {
            const originUrl = new URL(origin);
            const hostname = originUrl.hostname;
            
            // Allow localhost, 127.0.0.1, and private IP ranges
            if (hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.startsWith('192.168.') || 
                hostname.startsWith('10.') || 
                hostname.startsWith('172.16.') ||
                hostname.startsWith('172.17.') ||
                hostname.startsWith('172.18.') ||
                hostname.startsWith('172.19.') ||
                hostname.startsWith('172.20.') ||
                hostname.startsWith('172.21.') ||
                hostname.startsWith('172.22.') ||
                hostname.startsWith('172.23.') ||
                hostname.startsWith('172.24.') ||
                hostname.startsWith('172.25.') ||
                hostname.startsWith('172.26.') ||
                hostname.startsWith('172.27.') ||
                hostname.startsWith('172.28.') ||
                hostname.startsWith('172.29.') ||
                hostname.startsWith('172.30.') ||
                hostname.startsWith('172.31.')) {
                console.log(`[CORS] Allowing development origin: ${origin}`);
                return callback(null, true);
            }
        }
        
        console.log(`[CORS] Rejected origin: ${origin}`);
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true
}));
console.log('CORS middleware applied with enhanced origin detection.');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('Core middlewares applied (compression, morgan, cors, json/url-encoded parsers).');

// DEBUGGING ROUTES - Add these BEFORE static file configuration
const publicPath = path.join(__dirname, 'public');

// File system debugging route
app.get('/debug/files', (req, res) => {
    console.log(`\n=== FILE SYSTEM DEBUG ===`);
    console.log(`Checking public directory: ${publicPath}`);
    
    try {
        const exists = fs.existsSync(publicPath);
        console.log(`Public directory exists: ${exists}`);
        
        if (!exists) {
            return res.status(404).json({
                error: 'Public directory does not exist',
                publicPath,
                currentWorkingDir: process.cwd(),
                __dirname
            });
        }
        
        const files = fs.readdirSync(publicPath);
        console.log(`Files found: ${files.join(', ')}`);
        
        const fileDetails = files.map(file => {
            const filePath = path.join(publicPath, file);
            const stats = fs.statSync(filePath);
            console.log(`File: ${file} - Size: ${stats.size} bytes - Modified: ${stats.mtime}`);
            return {
                name: file,
                path: filePath,
                size: stats.size,
                isFile: stats.isFile(),
                modified: stats.mtime,
                permissions: stats.mode.toString(8)
            };
        });
        
        console.log(`========================\n`);
        
        res.json({
            success: true,
            publicPath,
            exists: true,
            files: fileDetails,
            currentWorkingDir: process.cwd(),
            __dirname,
            nodeEnv: process.env.NODE_ENV
        });
    } catch (error) {
        console.error(`Error reading directory: ${error.message}`);
        res.status(500).json({
            error: error.message,
            publicPath,
            exists: fs.existsSync(publicPath),
            currentWorkingDir: process.cwd(),
            __dirname
        });
    }
});

// Individual file debugging
app.get('/debug/static/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(publicPath, filename);
    
    console.log(`\n=== STATIC FILE DEBUG ===`);
    console.log(`Requested file: ${filename}`);
    console.log(`Full path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    const result = {
        filename,
        filePath,
        publicPath,
        exists: fs.existsSync(filePath)
    };
    
    if (fs.existsSync(filePath)) {
        try {
            const stats = fs.statSync(filePath);
            result.stats = {
                size: stats.size,
                modified: stats.mtime,
                isFile: stats.isFile(),
                permissions: stats.mode.toString(8)
            };
            
            // Try to read first few bytes for text files
            if (filename.endsWith('.css') || filename.endsWith('.js') || filename.endsWith('.html')) {
                const buffer = fs.readFileSync(filePath);
                result.preview = buffer.toString('utf8', 0, Math.min(300, buffer.length));
                console.log(`File preview (first 300 chars): ${result.preview}`);
            }
            
            console.log(`File size: ${stats.size} bytes`);
            console.log(`File modified: ${stats.mtime}`);
        } catch (readError) {
            console.error(`Error reading file stats: ${readError.message}`);
            result.error = readError.message;
        }
    } else {
        console.log(`File does not exist at: ${filePath}`);
    }
    
    console.log(`========================\n`);
    res.json(result);
});

// Test individual file serving with detailed logging
app.get('/test/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(publicPath, filename);
    
    console.log(`\n=== FILE SERVING TEST ===`);
    console.log(`Testing file: ${filename}`);
    console.log(`Full path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filename}`);
        console.log(`========================\n`);
        return res.status(404).json({
            error: `File not found: ${filename}`,
            path: filePath,
            exists: false
        });
    }
    
    // Set appropriate content type
    let contentType = 'text/plain';
    if (filename.endsWith('.css')) {
        contentType = 'text/css; charset=utf-8';
    } else if (filename.endsWith('.js')) {
        contentType = 'application/javascript; charset=utf-8';
    } else if (filename.endsWith('.html')) {
        contentType = 'text/html; charset=utf-8';
    } else if (filename.endsWith('.png')) {
        contentType = 'image/png';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache'); // Disable cache for testing
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving ${filename}:`, err.message);
            console.log(`========================\n`);
            if (!res.headersSent) {
                res.status(500).json({ error: `Error serving file: ${err.message}` });
            }
        } else {
            console.log(`Successfully served: ${filename}`);
            console.log(`Content-Type: ${contentType}`);
            console.log(`========================\n`);
        }
    });
});

// Network debugging route
app.get('/debug/network', (req, res) => {
    const interfaces = os.networkInterfaces();
    
    res.json({
        networkInterfaces: interfaces,
        detectedLocalIP: localIP,
        hostname: os.hostname(),
        platform: os.platform(),
        nodeVersion: process.version,
        processEnv: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT
        },
        requestDetails: {
            protocol: req.protocol,
            secure: req.secure,
            host: req.get('host'),
            origin: req.get('origin'),
            userAgent: req.get('user-agent'),
            url: req.originalUrl,
            method: req.method
        },
        allowedOrigins
    });
});

// SIMPLIFIED STATIC FILE SERVING - Remove complex headers for now
console.log(`Setting up static file serving from: ${publicPath}`);

// Primary static middleware - SIMPLIFIED
app.use(express.static(publicPath, {
    index: false, // Don't serve index.html automatically
    fallthrough: true,
    maxAge: 0, // Disable caching for debugging
    setHeaders: function (res, path, stat) {
        // Only set essential headers
        console.log(`[STATIC] Serving: ${path}`);
        res.set('Cache-Control', 'no-cache'); // Disable cache for debugging
        
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css; charset=utf-8');
        } else if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript; charset=utf-8');
        }
    }
}));

console.log('Static file serving configured.');

// EXPLICIT ROUTES FOR CRITICAL FILES with enhanced logging
app.get('/index.html', (req, res) => {
    console.log(`[EXPLICIT] index.html requested from: ${req.get('host')}`);
    const filePath = path.join(publicPath, 'index.html');
    
    if (!fs.existsSync(filePath)) {
        console.error(`[EXPLICIT] index.html not found at: ${filePath}`);
        return res.status(404).send('index.html not found');
    }
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[EXPLICIT] Error serving index.html:', err);
            res.status(500).send('Error serving index.html');
        } else {
            console.log('[EXPLICIT] index.html served successfully');
        }
    });
});

app.get('/style.css', (req, res) => {
    console.log(`[EXPLICIT] style.css requested from: ${req.get('host')}`);
    const filePath = path.join(publicPath, 'style.css');
    
    if (!fs.existsSync(filePath)) {
        console.error(`[EXPLICIT] style.css not found at: ${filePath}`);
        return res.status(404).send('style.css not found');
    }
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[EXPLICIT] Error serving style.css:', err);
            res.status(500).send('Error serving style.css');
        } else {
            console.log('[EXPLICIT] style.css served successfully');
        }
    });
});

app.get('/script.js', (req, res) => {
    console.log(`[EXPLICIT] script.js requested from: ${req.get('host')}`);
    const filePath = path.join(publicPath, 'script.js');
    
    if (!fs.existsSync(filePath)) {
        console.error(`[EXPLICIT] script.js not found at: ${filePath}`);
        return res.status(404).send('script.js not found');
    }
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[EXPLICIT] Error serving script.js:', err);
            res.status(500).send('Error serving script.js');
        } else {
            console.log('[EXPLICIT] script.js served successfully');
        }
    });
});

// Logo route (keep your existing one)
app.get('/logo-removebg-preview.png', (req, res) => {
    console.log(`[EXPLICIT] Logo requested from: ${req.get('host')}`);
    const filePath = path.join(publicPath, 'logo-removebg-preview.png');
    
    if (!fs.existsSync(filePath)) {
        console.error(`[EXPLICIT] Logo not found at: ${filePath}`);
        return res.status(404).send('Logo not found');
    }
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[EXPLICIT] Error serving logo:', err);
            res.status(500).send('Error serving logo');
        } else {
            console.log('[EXPLICIT] Logo served successfully');
        }
    });
});

// API Routes
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes);
console.log('API routes mounted.');

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
    const staticFiles = ['index.html', 'style.css', 'script.js', 'logo-removebg-preview.png'];
    const fileStatus = {};
    
    staticFiles.forEach(file => {
        const filePath = path.join(publicPath, file);
        const exists = fs.existsSync(filePath);
        fileStatus[file] = {
            exists,
            path: filePath
        };
        
        if (exists) {
            try {
                const stats = fs.statSync(filePath);
                fileStatus[file].size = stats.size;
                fileStatus[file].modified = stats.mtime;
            } catch (err) {
                fileStatus[file].error = err.message;
            }
        }
    });
    
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        host: req.get('host'),
        localIP: localIP,
        allowedOrigins: allowedOrigins,
        staticFiles: fileStatus,
        publicPath: publicPath,
        debugEndpoints: [
            '/debug/files',
            '/debug/network',
            '/debug/static/style.css',
            '/debug/static/script.js',
            '/debug/static/index.html',
            '/test/style.css',
            '/test/script.js',
            '/test/index.html'
        ]
    });
});
console.log('Enhanced health check endpoint configured.');

// Root route - serve index.html
app.get('/', (req, res) => {
    console.log(`[ROOT] Root requested from: ${req.get('host')}`);
    const filePath = path.join(publicPath, 'index.html');
    
    if (!fs.existsSync(filePath)) {
        console.error(`[ROOT] index.html not found at: ${filePath}`);
        return res.status(404).send(`
            <html>
                <body>
                    <h1>Error: index.html not found</h1>
                    <p>Looking for file at: ${filePath}</p>
                    <p><a href="/debug/files">Check file system</a></p>
                </body>
            </html>
        `);
    }
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[ROOT] Error serving index:', err);
            res.status(500).send(`Error loading page: ${err.message}`);
        } else {
            console.log('[ROOT] Index page served successfully');
        }
    });
});

// Fallback for SPA routing
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/debug') || req.originalUrl.startsWith('/test')) {
        return res.status(404).json({ 
            success: false, 
            message: 'Endpoint not found',
            path: req.originalUrl,
            method: req.method
        });
    }
    
    console.log(`[FALLBACK] Serving index for: ${req.originalUrl}`);
    const filePath = path.join(publicPath, 'index.html');
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Application not found');
    }
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[FALLBACK] Error in fallback route:', err);
            res.status(500).send('Error loading application');
        }
    });
});

// Error handling middleware
console.log('Attempting to apply error handling middleware...');
try {
    app.use(errorHandler);
    console.log('Error handling middleware mounted.');
} catch (error) {
    console.error('Error applying error handling middleware:', error);
    process.exit(1);
}

// Database connection
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inoxdev')
    .then(() => {
        logger.info('Connected to MongoDB');
        console.log('MongoDB connection successful.');
        
        // Server startup with enhanced information
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`InoxDev server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
            console.log(`\n🚀 ===== SERVER STARTED SUCCESSFULLY ===== 🚀`);
            console.log(`📡 Server listening on port ${PORT}`);
            console.log(`🏠 Local access: http://localhost:${PORT}`);
            console.log(`🌐 Network access: http://${localIP}:${PORT}`);
            console.log(`📁 Static files path: ${publicPath}`);
            console.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
            
            // File verification on startup
            const criticalFiles = ['index.html', 'style.css', 'script.js', 'logo-removebg-preview.png'];
            
            console.log(`\n📄 Static Files Status:`);
            criticalFiles.forEach(file => {
                const filePath = path.join(publicPath, file);
                const exists = fs.existsSync(filePath);
                let sizeInfo = '';
                
                if (exists) {
                    try {
                        const stats = fs.statSync(filePath);
                        sizeInfo = ` (${(stats.size / 1024).toFixed(2)} KB)`;
                    } catch (err) {
                        sizeInfo = ' (size unknown)';
                    }
                }
                
                console.log(`   ${exists ? '✅' : '❌'} ${file}${sizeInfo}`);
                if (!exists) {
                    console.log(`      Expected at: ${filePath}`);
                }
            });
            
            console.log(`\n🔧 Debug endpoints:`);
            console.log(`   📊 Health check: http://${localIP}:${PORT}/api/health`);
            console.log(`   📁 File system: http://${localIP}:${PORT}/debug/files`);
            console.log(`   🌐 Network info: http://${localIP}:${PORT}/debug/network`);
            console.log(`   🎨 Test CSS: http://${localIP}:${PORT}/test/style.css`);
            console.log(`   ⚡ Test JS: http://${localIP}:${PORT}/test/script.js`);
            console.log(`   🏠 Test HTML: http://${localIP}:${PORT}/test/index.html`);
            console.log(`\n============================================\n`);
        });
        
        // Graceful shutdown handlers
        const gracefulShutdown = () => {
            console.log('🔄 Graceful shutdown initiated...');
            server.close(() => {
                console.log('🛑 HTTP server closed.');
                mongoose.connection.close(() => {
                    console.log('🔌 MongoDB connection closed.');
                    process.exit(0);
                });
            });
        };
        
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        
    })
    .catch((error) => {
        logger.error('MongoDB connection error:', error);
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    });

console.log('--- End of server.js execution setup ---');

module.exports = app;