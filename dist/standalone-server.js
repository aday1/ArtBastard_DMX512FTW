"use strict";
/**
 * ArtBastard DMX512FTW Server
 * Standalone entry point that combines all necessary functionality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = require("body-parser");
const easymidi_1 = __importDefault(require("easymidi"));
const os_1 = __importDefault(require("os"));
const osc_1 = require("osc");
const dmxnet_1 = __importDefault(require("dmxnet"));
// Constants and configurations
const DATA_DIR = path_1.default.join(__dirname, '..', 'data');
const SCENES_FILE = path_1.default.join(DATA_DIR, 'scenes.json');
const CONFIG_FILE = path_1.default.join(DATA_DIR, 'config.json');
const LOGS_DIR = path_1.default.join(__dirname, '..', 'logs');
const LOG_FILE = path_1.default.join(LOGS_DIR, 'app.log');
// --- Logger Implementation (Inlined to avoid circular deps) ---
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    try {
        // Ensure logs directory exists
        if (!fs_1.default.existsSync(LOGS_DIR)) {
            try {
                fs_1.default.mkdirSync(LOGS_DIR, { recursive: true });
            }
            catch (error) {
                console.error(`Failed to create logs directory: ${error}`);
            }
        }
        // Write to log file
        fs_1.default.appendFileSync(LOG_FILE, logMessage);
    }
    catch (error) {
        console.error(`Error writing to log file: ${error}`);
    }
    // Always log to console
    console.log(message);
}
// --- Global state ---
let dmxChannels = new Array(512).fill(0);
let oscAssignments = new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`);
let channelNames = new Array(512).fill('').map((_, i) => `CH ${i + 1}`);
let fixtures = [];
let groups = [];
let scenes = [];
let sender = null;
let midiMappings = {};
let midiInput = null;
let currentMidiLearnChannel = null;
let currentMidiLearnScene = null;
let midiLearnTimeout = null;
let activeMidiInputs = {};
let artNetConfig = {
    ip: "192.168.1.199",
    subnet: 0,
    universe: 0,
    net: 0,
    port: 6454,
    base_refresh_interval: 1000
};
let artnetSender;
// --- Core functionality ---
function loadConfig() {
    if (fs_1.default.existsSync(CONFIG_FILE)) {
        const data = fs_1.default.readFileSync(CONFIG_FILE, 'utf-8');
        const parsedConfig = JSON.parse(data);
        artNetConfig = { ...artNetConfig, ...parsedConfig.artNetConfig };
        midiMappings = parsedConfig.midiMappings || {};
        log('Config loaded: ' + JSON.stringify(artNetConfig));
        return {
            artNetConfig,
            midiMappings
        };
    }
    else {
        saveConfig();
        return {
            artNetConfig,
            midiMappings
        };
    }
}
function saveConfig() {
    const configToSave = {
        artNetConfig,
        midiMappings
    };
    // Ensure the data directory exists
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    log('Config saved');
}
function isRunningInWsl() {
    return os_1.default.release().toLowerCase().includes('microsoft') ||
        os_1.default.release().toLowerCase().includes('wsl');
}
function loadScenes() {
    if (fs_1.default.existsSync(SCENES_FILE)) {
        const data = fs_1.default.readFileSync(SCENES_FILE, 'utf-8');
        log('Loading scenes from file');
        scenes = JSON.parse(data);
        return scenes;
    }
    else {
        scenes = [];
        saveScenes();
        return scenes;
    }
}
function saveScenes(scenesToSave) {
    if (scenesToSave) {
        scenes = scenesToSave;
    }
    // Ensure the data directory exists
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    const scenesJson = JSON.stringify(scenes, null, 2);
    fs_1.default.writeFileSync(SCENES_FILE, scenesJson);
    log('Scenes saved to file');
}
function updateDmxChannel(channel, value) {
    dmxChannels[channel] = value;
    if (artnetSender) {
        artnetSender.setChannel(channel, value);
        artnetSender.transmit();
    }
    else {
        log('ArtNet sender not initialized');
    }
}
function initializeArtNet() {
    try {
        const dmxnetInstance = new dmxnet_1.default.dmxnet({
            oem: 0,
            sName: "ArtBastard",
            lName: "ArtBastard DMX512 Controller",
            log: { level: 'none' }
        });
        // Clean up existing sender if it exists
        if (artnetSender && typeof artnetSender.close === 'function') {
            artnetSender.close();
        }
        artnetSender = dmxnetInstance.newSender({
            ip: artNetConfig.ip,
            subnet: artNetConfig.subnet,
            universe: artNetConfig.universe,
            net: artNetConfig.net,
            port: artNetConfig.port,
            base_refresh_interval: artNetConfig.base_refresh_interval
        });
        log(`ArtNet sender initialized with config: ${JSON.stringify(artNetConfig)}`);
        return true;
    }
    catch (error) {
        log(`Error initializing ArtNet: ${error}`);
        return false;
    }
}
function pingArtNetDevice(io, ip) {
    const targetIp = ip || artNetConfig.ip;
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 1000; // 1 second timeout
    socket.setTimeout(timeout);
    const connectionPromise = new Promise((resolve, reject) => {
        socket.connect(artNetConfig.port, targetIp, () => {
            socket.end();
            resolve(true);
        });
        socket.on('error', (err) => {
            socket.destroy();
            reject(err);
        });
        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timed out'));
        });
    });
    connectionPromise
        .then(() => {
        log(`ArtNet device at ${targetIp} is alive`);
        io.emit('artnetStatus', { ip: targetIp, status: 'alive' });
    })
        .catch((error) => {
        log(`ArtNet device at ${targetIp} is unreachable: ${error.message}`);
        io.emit('artnetStatus', {
            ip: targetIp,
            status: 'unreachable',
            message: 'Device is not responding on ArtNet port'
        });
    });
}
function listMidiInterfaces() {
    try {
        if (isRunningInWsl()) {
            log('WSL environment detected - MIDI hardware interfaces not accessible');
            return {
                inputs: [],
                outputs: [],
                isWsl: true
            };
        }
        const inputs = easymidi_1.default.getInputs();
        const outputs = easymidi_1.default.getOutputs();
        return { inputs, outputs, isWsl: false };
    }
    catch (error) {
        log(`Error listing MIDI interfaces: ${error}`);
        return {
            inputs: [],
            outputs: [],
            error: String(error)
        };
    }
}
function initOsc(io) {
    try {
        const oscPort = new osc_1.UDPPort({
            localAddress: "0.0.0.0",
            localPort: 57121,
            metadata: true
        });
        oscPort.on("ready", () => {
            log("OSC Port is ready");
            io.emit('oscStatus', { status: 'connected' });
            sender = oscPort;
        });
        oscPort.on("error", (error) => {
            log(`OSC error: ${error.message}`);
        });
        oscPort.open();
        log("Opening OSC port...");
    }
    catch (error) {
        log(`Error initializing OSC: ${error}`);
    }
}
// --- Create Express & Socket.IO server ---
function createServer() {
    const app = (0, express_1.default)();
    const server = http_1.default.createServer(app);
    // Ensure required directories exist
    [DATA_DIR, LOGS_DIR].forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            try {
                fs_1.default.mkdirSync(dir, { recursive: true });
                log(`Created directory: ${dir}`);
            }
            catch (error) {
                log(`Failed to create directory ${dir}: ${error}`);
            }
        }
    });
    // CORS setup
    app.use((0, cors_1.default)({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use((0, body_parser_1.json)());
    // Socket.IO setup
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: true,
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        allowUpgrades: true
    });
    // Error handlers
    process.on('uncaughtException', (err) => {
        log(`Uncaught Exception: ${err.message}`);
    });
    process.on('unhandledRejection', (reason) => {
        log(`Unhandled Rejection: ${reason}`);
    });
    // Initialize core functionality
    loadConfig();
    loadScenes();
    initializeArtNet();
    initOsc(io);
    // Socket.IO handlers
    io.on('connection', (socket) => {
        log('A user connected');
        // Send initial state
        socket.emit('initialState', {
            dmxChannels,
            oscAssignments,
            channelNames,
            fixtures,
            groups,
            midiMappings,
            artNetConfig,
            scenes
        });
        // Send MIDI interfaces
        const midiInterfaces = listMidiInterfaces();
        socket.emit('midiInterfaces', midiInterfaces.inputs);
        // Handle DMX channel updates
        socket.on('setDmxChannel', ({ channel, value }) => {
            updateDmxChannel(channel, value);
            io.emit('dmxUpdate', { channel, value });
        });
        // Handle ArtNet config updates
        socket.on('updateArtNetConfig', (config) => {
            artNetConfig = { ...artNetConfig, ...config };
            saveConfig();
            initializeArtNet();
            io.emit('artnetStatus', { status: 'configUpdated' });
        });
        // Handle test connection
        socket.on('testArtNetConnection', (ip) => {
            pingArtNetDevice(io, ip);
        });
        // Handle scene saving
        socket.on('saveScene', ({ name, oscAddress, state }) => {
            const existingSceneIndex = scenes.findIndex(s => s.name === name);
            const newScene = {
                name,
                channelValues: Array.isArray(state) ? state : Object.values(state),
                oscAddress
            };
            if (existingSceneIndex !== -1) {
                scenes[existingSceneIndex] = newScene;
            }
            else {
                scenes.push(newScene);
            }
            saveScenes();
            io.emit('sceneSaved', name);
            io.emit('sceneList', scenes);
        });
        // Handle scene loading
        socket.on('loadScene', ({ name }) => {
            const scene = scenes.find(s => s.name === name);
            if (scene) {
                let channelValues = Array.isArray(scene.channelValues) ?
                    scene.channelValues :
                    Object.values(scene.channelValues);
                channelValues.forEach((value, index) => {
                    if (index < dmxChannels.length) {
                        updateDmxChannel(index, value);
                    }
                });
                io.emit('sceneLoaded', { name, channelValues });
            }
        });
        // Handle disconnect
        socket.on('disconnect', () => {
            log('User disconnected');
        });
    });
    // Basic API routes
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });
    app.get('/api/state', (req, res) => {
        res.json({
            artNetConfig,
            midiMappings,
            scenes,
            dmxChannels: new Array(512).fill(0),
            oscAssignments: new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`),
            channelNames: new Array(512).fill('').map((_, i) => `CH ${i + 1}`),
            fixtures: [],
            groups: []
        });
    });
    // Serve static files
    const reactAppPath = path_1.default.join(__dirname, '..', 'react-app', 'dist');
    if (fs_1.default.existsSync(reactAppPath)) {
        app.use(express_1.default.static(reactAppPath, {
            setHeaders: (res, path) => {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        }));
        // Serve React app for all other routes
        app.get('*', (req, res) => {
            res.sendFile(path_1.default.join(reactAppPath, 'index.html'));
        });
    }
    else {
        // Create simple fallback UI if no React app
        app.get('/', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>ArtBastard DMX512FTW</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #1e1e1e; color: #eee; }
                        .container { max-width: 800px; margin: 50px auto; padding: 20px; }
                        h1 { color: #00b8ff; }
                        .status { background: #333; padding: 15px; border-radius: 4px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>ArtBastard DMX512FTW</h1>
                        <div class="status">
                            <h2>Server Status: Active</h2>
                            <p>Backend API is running on port 3001</p>
                            <p>React app not found in build folder</p>
                        </div>
                        <p>API endpoints available at /api/*</p>
                    </div>
                </body>
                </html>
            `);
        });
    }
    return { app, server, io };
}
// --- Start the server ---
const { server } = createServer();
const port = 3001; // Changed from 3000 to avoid conflict
server.listen(port, () => {
    log(`🚀 Server running at http://localhost:${port}`);
});
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        log(`ERROR: Port ${port} is already in use. Please close any applications using this port and try again.`);
    }
    else {
        log(`SERVER ERROR: ${error.message}`);
    }
});
