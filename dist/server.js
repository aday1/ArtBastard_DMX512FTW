"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = require("body-parser");
const index_1 = require("./index");
const api_1 = require("./api");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Configure CORS for all routes with more permissive settings
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((0, body_parser_1.json)());
// Configure Socket.IO with improved error handling and connection management
const io = new socket_io_1.Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e8,
    path: '/socket.io',
    // Add more robust connection handling
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    }
});
// Make io available globally for use in other modules
global.io = io;
// Add specific middleware for rate limiting and validation
io.use((socket, next) => {
    // Track message rate
    const messageCount = { count: 0, lastReset: Date.now() };
    const rateLimitWindow = 1000; // 1 second
    const maxMessagesPerWindow = 100;
    socket.on('message', () => {
        const now = Date.now();
        if (now - messageCount.lastReset > rateLimitWindow) {
            messageCount.count = 0;
            messageCount.lastReset = now;
        }
        messageCount.count++;
        if (messageCount.count > maxMessagesPerWindow) {
            socket.emit('error', 'Rate limit exceeded');
            return;
        }
    });
    // Validate connection
    if (socket.handshake.auth && socket.handshake.auth.token) {
        // Add your token validation logic here if needed
        next();
    }
    else {
        next();
    }
});
// Add global error handlers
io.engine.on("connection_error", (err) => {
    (0, index_1.log)(`Socket.IO connection error: ${err.message}`);
});
process.on('uncaughtException', (err) => {
    (0, index_1.log)(`Uncaught Exception: ${err.message}\nStack: ${err.stack}`);
});
process.on('unhandledRejection', (reason) => {
    (0, index_1.log)(`Unhandled Rejection: ${reason}`);
});
// Socket.IO connection handler
io.on('connection', (socket) => {
    (0, index_1.log)('A user connected');
    // Send available MIDI interfaces to the client
    const midiInterfaces = (0, index_1.listMidiInterfaces)();
    (0, index_1.log)(`MIDI interfaces found: ${JSON.stringify(midiInterfaces.inputs)}`);
    socket.emit('midiInterfaces', midiInterfaces.inputs);
    // Handle MIDI interface selection
    socket.on('selectMidiInterface', (interfaceName) => {
        (0, index_1.log)(`Selecting MIDI interface: ${interfaceName}`);
        (0, index_1.connectMidiInput)(io, interfaceName);
    });
    // Handle MIDI interface disconnection
    socket.on('disconnectMidiInterface', (interfaceName) => {
        (0, index_1.log)(`Disconnecting MIDI interface: ${interfaceName}`);
        (0, index_1.disconnectMidiInput)(io, interfaceName);
    });
    // Handle request for refreshing MIDI interfaces
    socket.on('getMidiInterfaces', () => {
        const midiInterfaces = (0, index_1.listMidiInterfaces)();
        socket.emit('midiInterfaces', midiInterfaces.inputs);
    });
    socket.on('updateArtNetConfig', (config) => {
        try {
            (0, index_1.updateArtNetConfig)(config);
            socket.emit('artnetStatus', { status: 'configUpdated' });
            // Test connection with new config
            (0, index_1.pingArtNetDevice)(io, config.ip);
        }
        catch (error) {
            socket.emit('artnetStatus', {
                status: 'error',
                message: `Config update failed: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    });
    socket.on('testArtNetConnection', (ip) => {
        try {
            (0, index_1.pingArtNetDevice)(io, ip);
        }
        catch (error) {
            socket.emit('artnetStatus', {
                status: 'error',
                message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    });
    socket.on('disconnect', (reason) => {
        (0, index_1.log)(`User disconnected (${reason})`);
    });
    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
        (0, index_1.log)(`Reconnection attempt ${attemptNumber} from ${socket.id}`);
    });
    socket.on('reconnect', (attemptNumber) => {
        (0, index_1.log)(`Client ${socket.id} reconnected after ${attemptNumber} attempts`);
    });
    socket.on('reconnect_error', (error) => {
        (0, index_1.log)(`Reconnection error from ${socket.id} - ${error}`);
    });
    socket.on('reconnect_failed', () => {
        (0, index_1.log)(`Client ${socket.id} failed to reconnect after all attempts`);
    });
});
// Set up API routes
app.use('/api', api_1.apiRouter);
// Serve static files from the React app with no caching
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'react-app', 'dist'), {
    setHeaders: (res, path) => {
        // Disable caching for all static files
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));
// For backward compatibility, also serve the original public directory
app.use('/public', express_1.default.static(path_1.default.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));
// For any routes not handled by specific endpoints, serve the React app
app.get('*', (req, res) => {
    const reactAppPath = path_1.default.join(__dirname, '..', 'react-app', 'dist', 'index.html');
    // Check if the React app is built
    if (fs_1.default.existsSync(reactAppPath)) {
        res.sendFile(reactAppPath);
    }
    else {
        // If React app is not built, redirect to the original interface
        (0, index_1.log)('React app not built. Redirecting to original interface.');
        res.redirect('/public');
    }
});
// Set up additional Socket.IO handlers from API
(0, api_1.setupSocketHandlers)(io);
// Start the server
const port = 3000; // Changed from 3001 to avoid conflict with frontend
server.listen(port, () => {
    (0, index_1.log)(`Server running at http://localhost:${port}`);
    (0, index_1.log)(`React app available at http://localhost:${port}`);
    (0, index_1.log)(`Original interface available at http://localhost:${port}/public`);
    (0, index_1.startLaserTime)(io);
});
