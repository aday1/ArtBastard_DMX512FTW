"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = exports.apiRouter = void 0;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
const DATA_DIR = path_1.default.join(__dirname, '..', 'data');
const EXPORT_FILE = path_1.default.join(DATA_DIR, 'all_settings.json');
// Create API router
const apiRouter = express_1.default.Router();
exports.apiRouter = apiRouter;
// Middleware to parse JSON
apiRouter.use(express_1.default.json());
// Health check endpoint
apiRouter.get('/health', (req, res) => {
    const io = global.io;
    // Get socket connection stats
    const stats = {
        serverStatus: 'healthy',
        socketConnections: io.engine.clientsCount || 0,
        socketStatus: io.sockets.sockets.size > 0 ? 'listening' : 'not listening',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        midiDevicesConnected: Object.keys(global.activeMidiInputs || {}).length,
        artnetStatus: global.artnetSender ? 'initialized' : 'not initialized'
    };
    // Determine overall health
    const isHealthy = stats.serverStatus === 'healthy' && stats.socketStatus === 'listening';
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        ...stats
    });
});
// Get initial state
apiRouter.get('/state', (req, res) => {
    try {
        // Load configuration and scenes
        const configData = fs_1.default.readFileSync(path_1.default.join(DATA_DIR, 'config.json'), 'utf-8');
        const config = JSON.parse(configData);
        const scenesData = fs_1.default.readFileSync(path_1.default.join(DATA_DIR, 'scenes.json'), 'utf-8');
        const scenes = JSON.parse(scenesData);
        // Return all state
        res.json({
            artNetConfig: config.artNetConfig,
            midiMappings: config.midiMappings,
            scenes,
            // Add any other state that needs to be initialized
            dmxChannels: new Array(512).fill(0),
            oscAssignments: new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`),
            channelNames: new Array(512).fill('').map((_, i) => `CH ${i + 1}`),
            fixtures: [],
            groups: [] // These would be loaded from groups.json if it existed
        });
    }
    catch (error) {
        (0, index_1.log)(`Error getting initial state: ${error}`);
        res.status(500).json({ error: `Failed to get initial state: ${error}` });
    }
});
// Set DMX channel value
const dmxHandler = (req, res) => {
    try {
        const { channel, value } = req.body;
        if (typeof channel !== 'number' || typeof value !== 'number') {
            res.status(400).json({ error: 'Invalid channel or value' });
            return;
        }
        (0, index_1.setDmxChannel)(channel, value);
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error setting DMX channel: ${error}`);
        res.status(500).json({ error: `Failed to set DMX channel: ${error}` });
    }
};
apiRouter.post('/dmx', dmxHandler);
// MIDI Learn endpoints
const midiLearnHandler = (req, res) => {
    try {
        const { channel } = req.body;
        if (typeof channel !== 'number') {
            res.status(400).json({ error: 'Invalid channel' });
            return;
        }
        // This function should be implemented in your index.ts file
        // It should emit a socket event to start MIDI learn mode
        global.io.emit('startMidiLearn', { channel });
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error starting MIDI learn: ${error}`);
        res.status(500).json({ error: `Failed to start MIDI learn: ${error}` });
    }
};
apiRouter.post('/midi/learn', midiLearnHandler);
apiRouter.post('/midi/cancel-learn', (req, res) => {
    try {
        const { channel } = req.body;
        global.io.emit('midiLearnCancelled', { channel });
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error cancelling MIDI learn: ${error}`);
        res.status(500).json({ error: `Failed to cancel MIDI learn: ${error}` });
    }
});
apiRouter.post('/midi/mapping', (req, res) => {
    try {
        const { dmxChannel, mapping } = req.body;
        (0, index_1.learnMidiMapping)(global.io, dmxChannel, mapping);
        (0, index_1.saveConfig)();
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error adding MIDI mapping: ${error}`);
        res.status(500).json({ error: `Failed to add MIDI mapping: ${error}` });
    }
});
apiRouter.delete('/midi/mapping/:channel', (req, res) => {
    try {
        const channel = parseInt(req.params.channel);
        // Remove the MIDI mapping for the given channel
        const config = (0, index_1.loadConfig)();
        if (config.midiMappings && channel in config.midiMappings) {
            delete config.midiMappings[channel];
        }
        (0, index_1.saveConfig)();
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error removing MIDI mapping: ${error}`);
        res.status(500).json({ error: `Failed to remove MIDI mapping: ${error}` });
    }
});
apiRouter.delete('/midi/mappings', (req, res) => {
    try {
        // Clear all MIDI mappings
        const config = (0, index_1.loadConfig)();
        config.midiMappings = {};
        (0, index_1.saveConfig)();
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error clearing all MIDI mappings: ${error}`);
        res.status(500).json({ error: `Failed to clear all MIDI mappings: ${error}` });
    }
});
// Scene endpoints
apiRouter.post('/scenes', (req, res) => {
    try {
        const { name, oscAddress, channelValues } = req.body;
        (0, index_1.saveScene)(global.io, name, oscAddress, channelValues);
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error saving scene: ${error}`);
        res.status(500).json({ error: `Failed to save scene: ${error}` });
    }
});
apiRouter.post('/scenes/load', (req, res) => {
    try {
        const { name } = req.body;
        (0, index_1.loadScene)(global.io, name);
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error loading scene: ${error}`);
        res.status(500).json({ error: `Failed to load scene: ${error}` });
    }
});
apiRouter.delete('/scenes/:name', (req, res) => {
    try {
        const { name } = req.params;
        // This function should be implemented in your index.ts file
        // It should delete the scene with the given name
        // Load scenes, filter out the one to delete, and save
        const scenes = (0, index_1.loadScenes)();
        const updatedScenes = scenes.filter((scene) => scene.name !== name);
        (0, index_1.saveScenes)(updatedScenes);
        global.io.emit('sceneList', updatedScenes);
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error deleting scene: ${error}`);
        res.status(500).json({ error: `Failed to delete scene: ${error}` });
    }
});
// ArtNet configuration
apiRouter.post('/config/artnet', (req, res) => {
    try {
        const artNetConfig = req.body;
        // Update ArtNet configuration
        const config = (0, index_1.loadConfig)();
        config.artNetConfig = { ...config.artNetConfig, ...artNetConfig };
        (0, index_1.saveConfig)();
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error updating ArtNet config: ${error}`);
        res.status(500).json({ error: `Failed to update ArtNet config: ${error}` });
    }
});
// Export all settings
apiRouter.post('/export', (req, res) => {
    try {
        const config = (0, index_1.loadConfig)();
        const scenes = (0, index_1.loadScenes)();
        const allSettings = {
            config,
            scenes,
            // Add any other settings you want to export
        };
        fs_1.default.writeFileSync(EXPORT_FILE, JSON.stringify(allSettings, null, 2));
        res.json({ success: true, filePath: EXPORT_FILE });
    }
    catch (error) {
        (0, index_1.log)(`Error exporting settings: ${error}`);
        res.status(500).json({ error: `Failed to export settings: ${error}` });
    }
});
// Import settings
const importHandler = (req, res) => {
    try {
        if (!fs_1.default.existsSync(EXPORT_FILE)) {
            res.status(404).json({ error: 'Export file not found' });
            return;
        }
        const data = fs_1.default.readFileSync(EXPORT_FILE, 'utf-8');
        const allSettings = JSON.parse(data);
        // Apply imported settings
        if (allSettings.config) {
            // Use the current config as a base and update it
            const config = (0, index_1.loadConfig)();
            Object.assign(config, allSettings.config);
            (0, index_1.saveConfig)();
        }
        if (allSettings.scenes) {
            (0, index_1.saveScenes)(allSettings.scenes);
        }
        // Notify clients
        global.io.emit('configUpdate', allSettings.config);
        global.io.emit('sceneList', allSettings.scenes);
        res.json({ success: true, settings: allSettings });
    }
    catch (error) {
        (0, index_1.log)(`Error importing settings: ${error}`);
        res.status(500).json({ error: `Failed to import settings: ${error}` });
    }
};
apiRouter.post('/import', importHandler);
// Ping ArtNet device
apiRouter.post('/ping-artnet', (req, res) => {
    try {
        const { ip } = req.body;
        (0, index_1.pingArtNetDevice)(global.io, ip);
        res.json({ success: true });
    }
    catch (error) {
        (0, index_1.log)(`Error pinging ArtNet device: ${error}`);
        res.status(500).json({ error: `Failed to ping ArtNet device: ${error}` });
    }
});
// Socket.IO handler setup
function setupSocketHandlers(io) {
    // Store the io instance globally for use in API routes
    global.io = io;
    io.on('connection', (socket) => {
        // Handle settings export
        socket.on('exportSettings', () => {
            try {
                const config = (0, index_1.loadConfig)();
                const scenes = (0, index_1.loadScenes)();
                const allSettings = {
                    config,
                    scenes,
                    // Add any other settings you want to export
                };
                fs_1.default.writeFileSync(EXPORT_FILE, JSON.stringify(allSettings, null, 2));
                socket.emit('settingsExported', EXPORT_FILE);
            }
            catch (error) {
                (0, index_1.log)(`Error exporting settings: ${error}`);
                socket.emit('exportError', error instanceof Error ? error.message : String(error));
            }
        });
        // Handle settings import
        socket.on('importSettings', () => {
            try {
                if (!fs_1.default.existsSync(EXPORT_FILE)) {
                    socket.emit('importError', 'Export file not found');
                    return;
                }
                const data = fs_1.default.readFileSync(EXPORT_FILE, 'utf-8');
                const allSettings = JSON.parse(data);
                // Apply imported settings
                if (allSettings.config) {
                    // Use the current config as a base and update it
                    const config = (0, index_1.loadConfig)();
                    Object.assign(config, allSettings.config);
                    (0, index_1.saveConfig)();
                }
                if (allSettings.scenes) {
                    (0, index_1.saveScenes)(allSettings.scenes);
                }
                // Notify clients
                io.emit('configUpdate', allSettings.config);
                io.emit('sceneList', allSettings.scenes);
                socket.emit('settingsImported', allSettings);
            }
            catch (error) {
                (0, index_1.log)(`Error importing settings: ${error}`);
                socket.emit('importError', error instanceof Error ? error.message : String(error));
            }
        });
        // Handle sending OSC messages
        socket.on('sendOsc', (message) => {
            try {
                // This function should be implemented in your index.ts file
                // It should send an OSC message with the given address and args
                sendOscMessage(message.address, message.args);
                // Forward OSC message to all clients for display
                io.emit('oscMessage', {
                    ...message,
                    timestamp: Date.now()
                });
            }
            catch (error) {
                (0, index_1.log)(`Error sending OSC message: ${error}`);
                socket.emit('error', `Failed to send OSC message: ${error}`);
            }
        });
        // Handle ArtNet ping
        socket.on('pingArtNet', (ip) => {
            (0, index_1.pingArtNetDevice)(io, ip);
        });
    });
}
exports.setupSocketHandlers = setupSocketHandlers;
// OSC message handler (to be implemented in index.ts)
function sendOscMessage(address, args) {
    // Implementation will depend on your OSC setup
    (0, index_1.log)(`Sending OSC message to ${address} with args: ${JSON.stringify(args)}`);
    // Actual implementation should send message to OSC sender
}
