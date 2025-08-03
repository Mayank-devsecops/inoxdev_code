// minimal-test-server.js
// Create this file to test static file serving in isolation

const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3001; // Use different port to avoid conflicts

// Get local IP
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIPAddress();
console.log(`Local IP: ${localIP}`);

// Simple CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    console.log(`${req.method} ${req.url} from ${req.get('host')}`);
    next();
});

// Serve static files
const publicPath = path.join(__dirname, 'public');
console.log(`Static files path: ${publicPath}`);

// Check if files exist
const fs = require('fs');
const files = ['index_3.html', 'style_3.css', 'script_3.js', 'logo-removebg-preview.png'];
console.log('\nFile check:');
files.forEach(file => {
    const exists = fs.existsSync(path.join(publicPath, file));
    console.log(`${file}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
});

// Static file middleware
app.use(express.static(publicPath, {
    setHeaders: (res, path) => {
        console.log(`Serving: ${path}`);
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Root route
app.get('/', (req, res) => {
    console.log(`Root requested from: ${req.get('host')}`);
    res.sendFile(path.join(publicPath, 'index_3.html'));
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Test server working',
        host: req.get('host'),
        ip: localIP,
        files: files.map(file => ({
            name: file,
            exists: fs.existsSync(path.join(publicPath, file)),
            path: path.join(publicPath, file)
        }))
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Test server running:`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Network: http://${localIP}:${PORT}`);
    console.log(`\n📋 Test these URLs:`);
    console.log(`   Main page: http://${localIP}:${PORT}`);
    console.log(`   Test info: http://${localIP}:${PORT}/test`);
    console.log(`   CSS file: http://${localIP}:${PORT}/style_3.css`);
    console.log(`   JS file: http://${localIP}:${PORT}/script_3.js`);
    console.log(`\n🔍 Check console for request logs...`);
});