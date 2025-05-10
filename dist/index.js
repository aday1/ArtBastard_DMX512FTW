"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateArtNetConfig = exports.clearMidiMappings = exports.pingArtNetDevice = exports.saveScenes = exports.loadScenes = exports.saveScene = exports.loadScene = exports.setDmxChannel = exports.addSocketHandlers = exports.disconnectMidiInput = exports.connectMidiInput = exports.startLaserTime = exports.initOsc = exports.saveConfig = exports.loadConfig = exports.learnMidiMapping = exports.simulateMidiInput = exports.listMidiInterfaces = exports.log = void 0;
const easymidi_1 = __importDefault(require("easymidi"));
// Import our adapter types to make TypeScript happy
require("./types/midi-types");
const os_1 = __importDefault(require("os"));
const osc_1 = require("osc");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Import our separate logger to avoid circular dependencies
const logger_1 = require("./logger");
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return logger_1.log; } });
// Import dmxnet using ES6 import syntax
const dmxnet_1 = __importDefault(require("dmxnet"));
// Variable declarations
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
// Constants and configurations
const DATA_DIR = path_1.default.join(__dirname, '..', 'data');
const SCENES_FILE = path_1.default.join(DATA_DIR, 'scenes.json');
const CONFIG_FILE = path_1.default.join(DATA_DIR, 'config.json');
const EXPORT_FILE = path_1.default.join(DATA_DIR, 'export_config.json');
const LOGS_DIR = path_1.default.join(__dirname, '..', 'logs');
const LOG_FILE = path_1.default.join(LOGS_DIR, 'app.log');
let isLoggingEnabled = true;
let isConsoleLoggingEnabled = true;
// Default ArtNet configuration
let artNetConfig = {
    ip: "192.168.1.199",
    subnet: 0,
    universe: 0,
    net: 0,
    port: 6454,
    base_refresh_interval: 1000
};
// ArtNet sender
let artnetSender;
function loadConfig() {
    if (fs_1.default.existsSync(CONFIG_FILE)) {
        const data = fs_1.default.readFileSync(CONFIG_FILE, 'utf-8');
        const parsedConfig = JSON.parse(data);
        artNetConfig = { ...artNetConfig, ...parsedConfig.artNetConfig };
        midiMappings = parsedConfig.midiMappings || {};
        (0, logger_1.log)('Config loaded: ' + JSON.stringify(artNetConfig));
        (0, logger_1.log)('MIDI mappings loaded: ' + JSON.stringify(midiMappings));
        // Return the config for use in the API
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
exports.loadConfig = loadConfig;
function saveConfig() {
    const configToSave = {
        artNetConfig,
        midiMappings
    };
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    (0, logger_1.log)('Config saved: ' + JSON.stringify(configToSave));
}
exports.saveConfig = saveConfig;
// Store active MIDI inputs
let activeMidiInputs = {};
// Helper function to check if running in WSL
function isRunningInWsl() {
    return os_1.default.release().toLowerCase().includes('microsoft') ||
        os_1.default.release().toLowerCase().includes('wsl');
}
function initializeMidi(io) {
    try {
        // Check if running in WSL environment
        if (isRunningInWsl()) {
            (0, logger_1.log)('WSL environment detected - using browser MIDI API only');
            io.emit('midiStatus', {
                status: 'wsl',
                message: 'Running in WSL - using browser MIDI API only',
                browserMidiOnly: true
            });
            return;
        }
        // Linux-specific ALSA checks
        if (process.platform === 'linux') {
            const hasSeqDevice = fs_1.default.existsSync('/dev/snd/seq');
            if (!hasSeqDevice) {
                (0, logger_1.log)('ALSA sequencer device not available');
                io.emit('midiStatus', {
                    status: 'limited',
                    message: 'ALSA not available - using browser MIDI API',
                    browserMidiOnly: true
                });
                return;
            }
        }
        // Continue with MIDI initialization
        const inputs = easymidi_1.default.getInputs();
        (0, logger_1.log)(`Found ${inputs.length} MIDI inputs: ${inputs.join(', ')}`);
        io.emit('midiStatus', {
            status: 'ready',
            message: inputs.length > 0 ? 'Hardware MIDI initialized' : 'No hardware MIDI devices found',
            inputs,
            browserMidiOnly: false
        });
    }
    catch (error) {
        (0, logger_1.log)(`MIDI initialization error: ${error}`);
        io.emit('midiStatus', {
            status: 'error',
            message: 'MIDI hardware initialization failed - using browser MIDI API',
            browserMidiOnly: true
        });
    }
}
function connectMidiInput(io, inputName, isBrowserMidi = false) {
    try {
        // Skip hardware MIDI connection if using browser MIDI
        if (isBrowserMidi) {
            (0, logger_1.log)(`Using browser MIDI for input: ${inputName}`);
            return;
        }
        if (isRunningInWsl()) {
            throw new Error('Hardware MIDI not available in WSL');
        }
        // Check if we're already connected to this input
        if (activeMidiInputs[inputName]) {
            (0, logger_1.log)(`Already connected to MIDI input: ${inputName}`);
            return;
        }
        // Connect to the selected MIDI input
        const newInput = new easymidi_1.default.Input(inputName);
        (0, logger_1.log)(`Successfully created MIDI input for ${inputName}`);
        // Set up event listeners for this input with improved error handling
        newInput.on('noteon', (msg) => {
            try {
                // Add source information to the message
                const msgWithSource = { ...msg, source: inputName };
                (0, logger_1.log)(`Received noteon: ${JSON.stringify(msgWithSource)}`);
                handleMidiMessage(io, 'noteon', msgWithSource);
            }
            catch (error) {
                (0, logger_1.log)(`Error handling noteon message: ${error}`);
            }
        });
        newInput.on('noteoff', (msg) => {
            try {
                // Also forward noteoff events with source information
                const msgWithSource = { ...msg, source: inputName };
                (0, logger_1.log)(`Received noteoff: ${JSON.stringify(msgWithSource)}`);
                io.emit('midiMessage', msgWithSource);
            }
            catch (error) {
                (0, logger_1.log)(`Error handling noteoff message: ${error}`);
            }
        });
        newInput.on('cc', (msg) => {
            try {
                // Add source information to the message
                const msgWithSource = { ...msg, source: inputName };
                (0, logger_1.log)(`Received cc: ${JSON.stringify(msgWithSource)}`);
                handleMidiMessage(io, 'cc', msgWithSource);
            }
            catch (error) {
                (0, logger_1.log)(`Error handling cc message: ${error}`);
            }
        });
        // Store this input in our active inputs
        activeMidiInputs[inputName] = newInput;
        midiInput = newInput; // Keep the last one as default for backward compatibility
        (0, logger_1.log)(`MIDI input connected: ${inputName}`);
        io.emit('midiInterfaceSelected', inputName);
        io.emit('midiInputsActive', Object.keys(activeMidiInputs));
    }
    catch (error) {
        (0, logger_1.log)(`Error connecting to MIDI input ${inputName}: ${error}`);
        io.emit('midiInterfaceError', `Failed to connect to ${inputName}: ${error}`);
    }
}
exports.connectMidiInput = connectMidiInput;
function disconnectMidiInput(io, inputName) {
    if (activeMidiInputs[inputName]) {
        activeMidiInputs[inputName].close();
        delete activeMidiInputs[inputName];
        (0, logger_1.log)(`MIDI input disconnected: ${inputName}`);
        io.emit('midiInputsActive', Object.keys(activeMidiInputs));
        io.emit('midiInterfaceDisconnected', inputName);
        // If this was the default input, set a new default if available
        if (midiInput === activeMidiInputs[inputName]) {
            const activeInputNames = Object.keys(activeMidiInputs);
            if (activeInputNames.length > 0) {
                midiInput = activeMidiInputs[activeInputNames[0]];
            }
            else {
                midiInput = null;
            }
        }
    }
}
exports.disconnectMidiInput = disconnectMidiInput;
function initOsc(io) {
    try {
        const oscPort = new osc_1.UDPPort({
            localAddress: "0.0.0.0",
            localPort: 57121,
            metadata: true
        });
        oscPort.on("ready", () => {
            (0, logger_1.log)("OSC Port is ready");
            io.emit('oscStatus', { status: 'connected' });
            sender = oscPort;
        });
        oscPort.on("error", (error) => {
            (0, logger_1.log)(`OSC error: ${error.message}`);
            io.emit('oscStatus', { status: 'error', message: error.message });
        });
        oscPort.on("message", (oscMsg) => {
            (0, logger_1.log)(`Received OSC message: ${JSON.stringify(oscMsg)}`);
            io.emit('oscMessage', {
                address: oscMsg.address,
                args: oscMsg.args,
                timestamp: Date.now()
            });
        });
        oscPort.open();
        (0, logger_1.log)("Opening OSC port...");
    }
    catch (error) {
        (0, logger_1.log)(`Error initializing OSC: ${error}`);
        io.emit('oscStatus', {
            status: 'error',
            message: `Failed to initialize OSC: ${error}`
        });
    }
}
exports.initOsc = initOsc;
function initializeArtNet() {
    try {
        const dmxnetInstance = new dmxnet_1.default.dmxnet({
            oem: 0,
            sName: "LaserTime",
            lName: "LaserTime DMX Controller",
            log: { level: 'none' } // Use proper log configuration instead of verbose
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
        // Setup error handlers for the sender
        if (artnetSender.on) {
            artnetSender.on('error', (err) => {
                (0, logger_1.log)(`ArtNet sender error: ${err.message}`);
                global.io?.emit('artnetStatus', {
                    status: 'error',
                    message: err.message
                });
            });
            artnetSender.on('timeout', () => {
                (0, logger_1.log)('ArtNet sender timeout - will retry');
                global.io?.emit('artnetStatus', {
                    status: 'timeout',
                    message: 'Connection timed out - retrying'
                });
            });
        }
        (0, logger_1.log)(`ArtNet sender initialized with config: ${JSON.stringify(artNetConfig)}`);
        // Initial ping to check connectivity
        if (global.io) {
            pingArtNetDevice(global.io, artNetConfig.ip);
        }
        return true;
    }
    catch (error) {
        (0, logger_1.log)(`Error initializing ArtNet: ${error}`);
        global.io?.emit('artnetStatus', {
            status: 'error',
            message: `Failed to initialize: ${error}`
        });
        return false;
    }
}
function listMidiInterfaces() {
    try {
        // Check if running in WSL using our helper function
        if (isRunningInWsl()) {
            (0, logger_1.log)('WSL environment detected - MIDI hardware interfaces not accessible');
            return {
                inputs: [],
                outputs: [],
                isWsl: true
            };
        }
        const inputs = easymidi_1.default.getInputs();
        const outputs = easymidi_1.default.getOutputs();
        (0, logger_1.log)("Available MIDI Inputs: " + JSON.stringify(inputs));
        (0, logger_1.log)("Available MIDI Outputs: " + JSON.stringify(outputs));
        return { inputs, outputs, isWsl: false };
    }
    catch (error) {
        (0, logger_1.log)(`Error listing MIDI interfaces: ${error}`);
        return {
            inputs: [],
            outputs: [],
            error: String(error)
        };
    }
}
exports.listMidiInterfaces = listMidiInterfaces;
function simulateMidiInput(io, type, channel, note, velocity) {
    let midiMessage;
    if (type === 'noteon') {
        midiMessage = {
            _type: 'noteon',
            channel: channel,
            note: note,
            velocity: velocity
        };
    }
    else {
        midiMessage = {
            _type: 'cc',
            channel: channel,
            controller: note,
            value: velocity
        };
    }
    handleMidiMessage(io, type, midiMessage);
}
exports.simulateMidiInput = simulateMidiInput;
function learnMidiMapping(io, dmxChannel, midiMapping) {
    midiMappings[dmxChannel] = midiMapping;
    io.emit('midiMappingLearned', { channel: dmxChannel, mapping: midiMapping });
    (0, logger_1.log)(`MIDI mapping learned for channel ${dmxChannel}: ${JSON.stringify(midiMapping)}`);
}
exports.learnMidiMapping = learnMidiMapping;
function handleMidiMessage(io, type, msg) {
    // Send the raw MIDI message to all clients
    io.emit('midiMessage', msg);
    // Debug MIDI message - add extra logging when in learn mode
    if (currentMidiLearnChannel !== null) {
        (0, logger_1.log)(`MIDI message received during LEARN MODE: type=${type}, channel=${msg.channel}, controller=${msg.controller}, note=${msg.note}, velocity=${msg.velocity}`);
    }
    // Handle MIDI learn mode
    if (currentMidiLearnChannel !== null) {
        // For MIDI Learn, we're interested in CC messages or Note On messages
        let midiMapping;
        (0, logger_1.log)(`Processing MIDI for learn mode: ${JSON.stringify(msg)}`);
        if (type === 'noteon') {
            (0, logger_1.log)(`Creating note mapping for channel ${currentMidiLearnChannel}`);
            midiMapping = {
                channel: msg.channel,
                note: msg.note !== undefined ? msg.note : 0
            };
        }
        else if (type === 'cc') { // cc
            (0, logger_1.log)(`Creating CC mapping for channel ${currentMidiLearnChannel}`);
            midiMapping = {
                channel: msg.channel,
                controller: msg.controller !== undefined ? msg.controller : 0
            };
        }
        else {
            (0, logger_1.log)(`Ignoring message type ${type} for MIDI learn`);
            return; // Not a message type we care about for learning
        }
        // Store the current channel before clearing it
        const learnedChannel = currentMidiLearnChannel;
        // Learn the mapping
        learnMidiMapping(io, learnedChannel, midiMapping);
        currentMidiLearnChannel = null;
        // Clear the midi learn timeout if it's active
        if (midiLearnTimeout) {
            clearTimeout(midiLearnTimeout);
            midiLearnTimeout = null;
        }
        // Save the config and update clients
        saveConfig();
        io.emit('midiMappingUpdate', midiMappings);
        // Send a confirmation that MIDI learn completed successfully
        (0, logger_1.log)(`MIDI learn complete for channel ${learnedChannel}: ${JSON.stringify(midiMapping)}`);
        io.emit('midiLearnComplete', {
            channel: learnedChannel,
            mapping: midiMapping
        });
        return;
    }
    // Handle MIDI scene learn mode
    if (currentMidiLearnScene !== null) {
        const scene = scenes.find(s => s.name === currentMidiLearnScene);
        if (scene) {
            let midiMapping;
            if (type === 'noteon') {
                midiMapping = {
                    channel: msg.channel,
                    note: msg.note !== undefined ? msg.note : 0
                };
            }
            else { // cc
                midiMapping = {
                    channel: msg.channel,
                    controller: msg.controller !== undefined ? msg.controller : 0
                };
            }
            scene.midiMapping = midiMapping;
            io.emit('sceneMidiMappingLearned', { scene: currentMidiLearnScene, mapping: midiMapping });
            currentMidiLearnScene = null;
            // Clear the midi learn timeout if it's active
            if (midiLearnTimeout) {
                clearTimeout(midiLearnTimeout);
                midiLearnTimeout = null;
            }
            saveScenes();
            return;
        }
    }
    // Regular MIDI control handling
    if (type === 'cc') {
        // Ensure controller is defined before using it
        if (msg.controller !== undefined) {
            const controlKey = `${msg.channel}:${msg.controller}`;
            for (const [dmxChannel, mapping] of Object.entries(midiMappings)) {
                // Skip if mapping doesn't have controller property
                if (mapping.controller === undefined)
                    continue;
                const mappingKey = `${mapping.channel}:${mapping.controller}`;
                if (mappingKey === controlKey) {
                    const channelIdx = parseInt(dmxChannel);
                    // Make sure value is defined before using it
                    if (msg.value !== undefined) {
                        const scaledValue = Math.floor((msg.value / 127) * 255);
                        updateDmxChannel(channelIdx, scaledValue);
                        io.emit('dmxUpdate', { channel: channelIdx, value: scaledValue });
                    }
                }
            }
        }
    }
    else if (type === 'noteon') {
        // Ensure note is defined before using it
        if (msg.note !== undefined) {
            // Check for scene triggers
            scenes.forEach(scene => {
                if (scene.midiMapping &&
                    scene.midiMapping.channel === msg.channel &&
                    scene.midiMapping.note === msg.note) {
                    loadScene(io, scene.name);
                }
            });
        }
    }
}
function saveScene(io, name, oscAddress, state) {
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
    (0, logger_1.log)(`Scene saved: ${JSON.stringify(newScene)}`);
}
exports.saveScene = saveScene;
function loadScene(io, name) {
    const scene = scenes.find(s => s.name === name);
    if (scene) {
        let channelValues;
        if (Array.isArray(scene.channelValues)) {
            channelValues = scene.channelValues;
        }
        else if (typeof scene.channelValues === 'object') {
            channelValues = Object.values(scene.channelValues);
        }
        else {
            (0, logger_1.log)(`Error loading scene ${name}: Invalid channelValues format`);
            io.emit('sceneLoadError', { name, error: 'Invalid channelValues format' });
            return;
        }
        channelValues.forEach((value, index) => {
            if (index < dmxChannels.length) {
                updateDmxChannel(index, value);
            }
        });
        io.emit('sceneLoaded', { name, channelValues });
        (0, logger_1.log)(`Scene loaded: ${name}`);
    }
    else {
        (0, logger_1.log)(`Error loading scene ${name}: Scene not found`);
        io.emit('sceneLoadError', { name, error: 'Scene not found' });
    }
}
exports.loadScene = loadScene;
function updateDmxChannel(channel, value) {
    dmxChannels[channel] = value;
    if (artnetSender) {
        artnetSender.setChannel(channel, value);
        artnetSender.transmit();
        (0, logger_1.log)(`DMX channel ${channel} set to ${value}`);
    }
    else {
        (0, logger_1.log)('ArtNet sender not initialized');
    }
}
exports.setDmxChannel = updateDmxChannel;
function saveScenes(scenesToSave) {
    if (scenesToSave) {
        scenes = scenesToSave;
    }
    const scenesJson = JSON.stringify(scenes, null, 2);
    (0, logger_1.log)('Saving scenes: ' + scenesJson);
    fs_1.default.writeFileSync(SCENES_FILE, scenesJson);
    (0, logger_1.log)('Scenes saved to file');
}
exports.saveScenes = saveScenes;
function loadScenes() {
    if (fs_1.default.existsSync(SCENES_FILE)) {
        const data = fs_1.default.readFileSync(SCENES_FILE, 'utf-8');
        (0, logger_1.log)('Raw scenes data from file: ' + data);
        scenes = JSON.parse(data);
        (0, logger_1.log)('Scenes loaded: ' + JSON.stringify(scenes));
        return scenes;
    }
    else {
        scenes = [];
        saveScenes();
        return scenes;
    }
}
exports.loadScenes = loadScenes;
function pingArtNetDevice(io, ip) {
    // If ip is provided, use it instead of the config IP
    const targetIp = ip || artNetConfig.ip;
    // First try TCP connection to ArtNet port
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 1000; // 1 second timeout
    socket.setTimeout(timeout);
    // Create a promise that rejects on timeout
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
        (0, logger_1.log)(`ArtNet device at ${targetIp} is alive`);
        io.emit('artnetStatus', { ip: targetIp, status: 'alive' });
    })
        .catch((error) => {
        // Don't treat connection failures as errors, just report device as unreachable
        (0, logger_1.log)(`ArtNet device at ${targetIp} is unreachable: ${error.message}`);
        io.emit('artnetStatus', {
            ip: targetIp,
            status: 'unreachable',
            message: 'Device is not responding on ArtNet port'
        });
    });
}
exports.pingArtNetDevice = pingArtNetDevice;
function startLaserTime(io) {
    loadConfig();
    loadScenes();
    // Check if we're in WSL and log special message about browser MIDI
    if (isRunningInWsl()) {
        (0, logger_1.log)('Starting in WSL environment - hardware MIDI devices unavailable');
        (0, logger_1.log)('Users can still use Web MIDI API from browsers');
    }
    initializeMidi(io);
    initOsc(io);
    initializeArtNet();
    // Start pinging ArtNet device every 5 seconds
    setInterval(() => pingArtNetDevice(io), 5000);
    io.on('connection', (socket) => {
        (0, logger_1.log)('A user connected');
        // Send initial state to the client
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
        socket.on('setDmxChannel', ({ channel, value }) => {
            (0, logger_1.log)(`Setting DMX channel ${channel} to value ${value}`);
            updateDmxChannel(channel, value);
            io.emit('dmxUpdate', { channel, value });
        });
        socket.on('saveScene', ({ name, oscAddress, state }) => {
            (0, logger_1.log)(`Saving scene: ${name}`);
            saveScene(io, name, oscAddress, state);
        });
        socket.on('loadScene', ({ name }) => {
            (0, logger_1.log)(`Loading scene: ${name}`);
            loadScene(io, name);
        });
        // MIDI learn mode handler for the startMidiLearn event
        socket.on('startMidiLearn', ({ channel }) => {
            (0, logger_1.log)(`Starting MIDI learn for channel ${channel}`);
            // If already in learn mode, cancel it first
            if (currentMidiLearnChannel !== null) {
                (0, logger_1.log)(`Cancelling previous MIDI learn for channel ${currentMidiLearnChannel}`);
                io.emit('midiLearnCancelled', { channel: currentMidiLearnChannel });
            }
            // Set the new channel for learning
            currentMidiLearnChannel = channel;
            // Auto-cancel MIDI learn after 30 seconds if no MIDI input is received
            if (midiLearnTimeout) {
                clearTimeout(midiLearnTimeout);
            }
            midiLearnTimeout = setTimeout(() => {
                if (currentMidiLearnChannel !== null) {
                    (0, logger_1.log)(`MIDI learn for channel ${currentMidiLearnChannel} timed out`);
                    currentMidiLearnChannel = null;
                    io.emit('midiLearnTimeout', { channel });
                }
            }, 30000);
            io.emit('midiLearnStarted', { channel });
        });
        // CRITICAL FIX: Add handler for learnMidiMapping event
        socket.on('learnMidiMapping', ({ channel }) => {
            (0, logger_1.log)(`Starting MIDI learn for channel ${channel} (via learnMidiMapping event)`);
            // If already in learn mode, cancel it first
            if (currentMidiLearnChannel !== null) {
                (0, logger_1.log)(`Cancelling previous MIDI learn for channel ${currentMidiLearnChannel}`);
                io.emit('midiLearnCancelled', { channel: currentMidiLearnChannel });
            }
            // Set the new channel for learning
            currentMidiLearnChannel = channel;
            // Auto-cancel MIDI learn after 30 seconds if no MIDI input is received
            if (midiLearnTimeout) {
                clearTimeout(midiLearnTimeout);
            }
            midiLearnTimeout = setTimeout(() => {
                if (currentMidiLearnChannel !== null) {
                    (0, logger_1.log)(`MIDI learn for channel ${currentMidiLearnChannel} timed out`);
                    currentMidiLearnChannel = null;
                    io.emit('midiLearnTimeout', { channel });
                }
            }, 30000);
            io.emit('midiLearnStarted', { channel });
            (0, logger_1.log)(`MIDI learn mode ACTIVE for channel ${channel} - awaiting MIDI input...`);
        });
        // Handle browser MIDI messages
        socket.on('browserMidiMessage', (msg) => {
            (0, logger_1.log)(`Received browser MIDI message: ${JSON.stringify(msg)}`);
            // Forward the message to all clients to maintain MIDI visualization
            io.emit('midiMessage', msg);
            // Process the message the same way we would for hardware MIDI
            if (msg._type === 'noteon' || msg._type === 'cc') {
                handleMidiMessage(io, msg._type, msg);
            }
        });
        socket.on('error', (err) => {
            (0, logger_1.log)(`Socket error: ${err.message}`);
        });
        socket.on('disconnect', () => {
            (0, logger_1.log)('User disconnected');
        });
    });
}
exports.startLaserTime = startLaserTime;
// Add these missing function declarations
function addSocketHandlers(io) {
    (0, logger_1.log)('Socket handlers being initialized (via addSocketHandlers)');
    // This is just a placeholder - all handlers are set up in startLaserTime
}
exports.addSocketHandlers = addSocketHandlers;
// Create a clearMidiMappings function
function clearMidiMappings(channelToRemove) {
    if (channelToRemove !== undefined) {
        // Remove a specific channel mapping
        if (channelToRemove in midiMappings) {
            delete midiMappings[channelToRemove];
        }
    }
    else {
        // Clear all mappings
        midiMappings = {};
    }
}
exports.clearMidiMappings = clearMidiMappings;
// Create an updateArtNetConfig function
function updateArtNetConfig(config) {
    artNetConfig = { ...artNetConfig, ...config };
    // Re-initialize ArtNet with new config if needed
    if (artnetSender) {
        try {
            // Close the existing sender if possible
            if (typeof artnetSender.close === 'function') {
                artnetSender.close();
            }
            // Re-initialize with new config
            initializeArtNet();
        }
        catch (error) {
            (0, logger_1.log)(`Error reinitializing ArtNet with new config: ${error}`);
        }
    }
}
exports.updateArtNetConfig = updateArtNetConfig;
