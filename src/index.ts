import easymidi, { Input } from 'easymidi';
// Import our adapter types to make TypeScript happy
import './types/midi-types';

export interface MidiMessage {
    _type: string;
    channel: number;
    controller?: number;
    value?: number;
    note?: number;
    velocity?: number;
    number?: number;  // For program change messages
    source?: string;
}
import { Server, Socket } from 'socket.io';
import os from 'os';
import { UDPPort, OscMessage } from 'osc';
import fs from 'fs';
import path from 'path';
import EffectsEngine from './effects';
import ping from 'ping';

// Import dmxnet using ES6 import syntax
import dmxnet from 'dmxnet';

// Type definitions
interface Fixture {
    name: string;
    startAddress: number;
    channels: { name: string; type: string }[];
}

interface Group {
    name: string;
    fixtureIndices: number[];
}

interface MidiMapping {
    channel: number;
    note?: number;
    controller?: number;
}

interface Scene {
    name: string;
    channelValues: number[];
    oscAddress: string;
    midiMapping?: MidiMapping;
}

type MidiMappings = { [dmxChannel: number]: MidiMapping };

interface ArtNetConfig {
    ip: string;
    subnet: number;
    universe: number;
    net: number;
    port: number;
    base_refresh_interval: number;
}

// Variable declarations
let dmxChannels: number[] = new Array(512).fill(0);
let oscAssignments: string[] = new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`);
let channelNames: string[] = new Array(512).fill('').map((_, i) => `CH ${i + 1}`);
let fixtures: Fixture[] = [];
let groups: Group[] = [];
let scenes: Scene[] = [];
let sender: any = null;
let midiMappings: MidiMappings = {};
let midiInput: Input | null = null;
let currentMidiLearnChannel: number | null = null;
let currentMidiLearnScene: string | null = null;
let midiLearnTimeout: NodeJS.Timeout | null = null;

// Constants and configurations
const DATA_DIR = path.join(__dirname, '..', 'data');
const SCENES_FILE = path.join(DATA_DIR, 'scenes.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const EXPORT_FILE = path.join(DATA_DIR, 'export_config.json');
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'app.log');

let isLoggingEnabled = true;
let isConsoleLoggingEnabled = true;

// Default ArtNet configuration
let artNetConfig: ArtNetConfig = {
    ip: "192.168.1.199",
    subnet: 0,
    universe: 0,
    net: 0,
    port: 6454,
    base_refresh_interval: 1000
};

// ArtNet sender
let artnetSender: any;

function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;

    if (isLoggingEnabled) {
        fs.appendFileSync(LOG_FILE, logMessage);
    }

    if (isConsoleLoggingEnabled) {
        console.log(message);
    }
}

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsedConfig = JSON.parse(data);
        artNetConfig = { ...artNetConfig, ...parsedConfig.artNetConfig };
        midiMappings = parsedConfig.midiMappings || {};
        log('Config loaded: ' + JSON.stringify(artNetConfig));
        log('MIDI mappings loaded: ' + JSON.stringify(midiMappings));
        
        // Return the config for use in the API
        return {
            artNetConfig,
            midiMappings
        };
    } else {
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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    log('Config saved: ' + JSON.stringify(configToSave));
}

// Store active MIDI inputs
let activeMidiInputs: {[name: string]: Input} = {};

// Helper function to check if running in WSL
function isRunningInWsl(): boolean {
    return os.release().toLowerCase().includes('microsoft') || 
           os.release().toLowerCase().includes('wsl');
}

function initializeMidi(io: Server) {
    try {
        // Check if running in WSL environment
        if (isRunningInWsl()) {
            log('Running in WSL environment - MIDI hardware device access is limited');
            log('Browser MIDI API will still work for MIDI functionality');
            io.emit('midiStatus', { 
                status: 'wsl', 
                message: 'Running in WSL - hardware MIDI devices not accessible. Browser MIDI is available.' 
            });
            return;
        }

        // Check if ALSA is available (on Linux)
        if (process.platform === 'linux') {
            try {
                const fs = require('fs');
                if (!fs.existsSync('/dev/snd/seq')) {
                    log('ALSA sequencer device not available - MIDI hardware access will be limited');
                    io.emit('midiStatus', {
                        status: 'limited',
                        message: 'ALSA sequencer not available. Browser MIDI will still work.'
                    });
                    return;
                }
            } catch (error) {
                log(`ALSA check failed: ${error}`);
                io.emit('midiStatus', {
                    status: 'limited',
                    message: 'ALSA check failed. Browser MIDI will still work.'
                });
                return;
            }
        }
        
        const inputs = easymidi.getInputs();
        if (inputs.length > 0) {
            // Auto-connect to the first input initially (for backward compatibility)
            connectMidiInput(io, inputs[0]);
            log(`Available MIDI inputs: ${inputs.join(', ')}`);
        } else {
            log('No MIDI inputs available');
            io.emit('midiStatus', {
                status: 'noDevices',
                message: 'No MIDI hardware devices found. Browser MIDI will still work.'
            });
        }
    } catch (error) {
        log(`MIDI initialization error: ${error}`);
        log('Continuing without MIDI hardware support. Browser MIDI will still work if available.');
        io.emit('midiStatus', { 
            status: 'error', 
            message: `MIDI hardware initialization failed: ${error}. Browser MIDI is available.` 
        });
    }
}

function connectMidiInput(io: Server, inputName: string) {
    try {
        // Check if running in WSL
        if (isRunningInWsl()) {
            log(`Cannot connect to MIDI input in WSL environment: ${inputName}`);
            io.emit('midiConnectionError', {
                input: inputName,
                error: 'Cannot connect to hardware MIDI devices in WSL environment'
            });
            return;
        }
        
        // Check if we're already connected to this input
        if (activeMidiInputs[inputName]) {
            log(`Already connected to MIDI input: ${inputName}`);
            return;
        }
        
        // Connect to the selected MIDI input
        const newInput = new easymidi.Input(inputName);
        log(`Successfully created MIDI input for ${inputName}`);
        
        // Set up event listeners for this input with improved error handling
        newInput.on('noteon', (msg: MidiMessage) => {
            try {
                // Add source information to the message
                const msgWithSource = { ...msg, source: inputName };
                log(`Received noteon: ${JSON.stringify(msgWithSource)}`);
                handleMidiMessage(io, 'noteon', msgWithSource as MidiMessage);
            } catch (error) {
                log(`Error handling noteon message: ${error}`);
            }
        });
        
        newInput.on('noteoff', (msg: MidiMessage) => {
            try {
                // Also forward noteoff events with source information
                const msgWithSource = { ...msg, source: inputName };
                log(`Received noteoff: ${JSON.stringify(msgWithSource)}`);
                io.emit('midiMessage', msgWithSource);
            } catch (error) {
                log(`Error handling noteoff message: ${error}`);
            }
        });
        
        newInput.on('cc', (msg: MidiMessage) => {
            try {
                // Add source information to the message
                const msgWithSource = { ...msg, source: inputName };
                log(`Received cc: ${JSON.stringify(msgWithSource)}`);
                handleMidiMessage(io, 'cc', msgWithSource as MidiMessage);
            } catch (error) {
                log(`Error handling cc message: ${error}`);
            }
        });
        
        // Store this input in our active inputs
        activeMidiInputs[inputName] = newInput;
        midiInput = newInput; // Keep the last one as default for backward compatibility
        
        log(`MIDI input connected: ${inputName}`);
        io.emit('midiInterfaceSelected', inputName);
        io.emit('midiInputsActive', Object.keys(activeMidiInputs));
    } catch (error) {
        log(`Error connecting to MIDI input ${inputName}: ${error}`);
        io.emit('midiInterfaceError', `Failed to connect to ${inputName}: ${error}`);
    }
}

function disconnectMidiInput(io: Server, inputName: string) {
    if (activeMidiInputs[inputName]) {
        activeMidiInputs[inputName].close();
        delete activeMidiInputs[inputName];
        log(`MIDI input disconnected: ${inputName}`);
        io.emit('midiInputsActive', Object.keys(activeMidiInputs));
        io.emit('midiInterfaceDisconnected', inputName);
        
        // If this was the default input, set a new default if available
        if (midiInput === activeMidiInputs[inputName]) {
            const activeInputNames = Object.keys(activeMidiInputs);
            if (activeInputNames.length > 0) {
                midiInput = activeMidiInputs[activeInputNames[0]];
            } else {
                midiInput = null;
            }
        }
    }
}

function initOsc(io: Server) {
    // Implementation of initOsc function
    // This should be already defined in your existing code
}

function initializeArtNet() {
    try {
        const dmxnetInstance = new dmxnet.dmxnet({
            oem: 0,
            sName: "LaserTime",
            lName: "LaserTime DMX Controller",
        });

        artnetSender = dmxnetInstance.newSender({
            ip: artNetConfig.ip,
            subnet: artNetConfig.subnet,
            universe: artNetConfig.universe,
            net: artNetConfig.net,
            port: artNetConfig.port,
            base_refresh_interval: artNetConfig.base_refresh_interval
        });

        log(`ArtNet sender initialized with config: ${JSON.stringify(artNetConfig)}`);
    } catch (error) {
        log(`Error initializing ArtNet: ${error}`);
        throw new Error(`Failed to initialize ArtNet: ${error}`);
    }
}

function listMidiInterfaces() {
    try {
        // Check if running in WSL using our helper function
        if (isRunningInWsl()) {
            log('WSL environment detected - MIDI hardware interfaces not accessible');
            return { 
                inputs: [], 
                outputs: [],
                isWsl: true
            };
        }
        
        const inputs = easymidi.getInputs();
        const outputs = easymidi.getOutputs();
        log("Available MIDI Inputs: " + JSON.stringify(inputs));
        log("Available MIDI Outputs: " + JSON.stringify(outputs));
        return { inputs, outputs, isWsl: false };
    } catch (error) {
        log(`Error listing MIDI interfaces: ${error}`);
        return { 
            inputs: [], 
            outputs: [],
            error: String(error)
        };
    }
}

function simulateMidiInput(io: Server, type: 'noteon' | 'cc', channel: number, note: number, velocity: number) {
    let midiMessage: MidiMessage;
    if (type === 'noteon') {
        midiMessage = {
            _type: 'noteon',
            channel: channel,
            note: note,
            velocity: velocity
        };
    } else {
        midiMessage = {
            _type: 'cc',
            channel: channel,
            controller: note,
            value: velocity
        };
    }
    handleMidiMessage(io, type, midiMessage);
}

function learnMidiMapping(io: Server, dmxChannel: number, midiMapping: MidiMapping) {
    midiMappings[dmxChannel] = midiMapping;
    io.emit('midiMappingLearned', { channel: dmxChannel, mapping: midiMapping });
    log(`MIDI mapping learned for channel ${dmxChannel}: ${JSON.stringify(midiMapping)}`);
}

function handleMidiMessage(io: Server, type: 'noteon' | 'cc', msg: MidiMessage) {
    // Send the raw MIDI message to all clients
    io.emit('midiMessage', msg);
    
    // Debug MIDI message - add extra logging when in learn mode
    if (currentMidiLearnChannel !== null) {
        log(`MIDI message received during LEARN MODE: type=${type}, channel=${msg.channel}, controller=${msg.controller}, note=${msg.note}, velocity=${msg.velocity}`);
    }
    
    // Handle MIDI learn mode
    if (currentMidiLearnChannel !== null) {
        // For MIDI Learn, we're interested in CC messages or Note On messages
        let midiMapping: MidiMapping;
        log(`Processing MIDI for learn mode: ${JSON.stringify(msg)}`);
        
        if (type === 'noteon') {
            log(`Creating note mapping for channel ${currentMidiLearnChannel}`);
            midiMapping = {
                channel: msg.channel,
                note: msg.note !== undefined ? msg.note : 0
            };
        } else if (type === 'cc') { // cc
            log(`Creating CC mapping for channel ${currentMidiLearnChannel}`);
            midiMapping = {
                channel: msg.channel,
                controller: msg.controller !== undefined ? msg.controller : 0
            };
        } else {
            log(`Ignoring message type ${type} for MIDI learn`);
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
        log(`MIDI learn complete for channel ${learnedChannel}: ${JSON.stringify(midiMapping)}`);
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
            let midiMapping: MidiMapping;
            
            if (type === 'noteon') {
                midiMapping = {
                    channel: msg.channel,
                    note: msg.note !== undefined ? msg.note : 0
                };
            } else { // cc
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
                if (mapping.controller === undefined) continue;
                
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
    } else if (type === 'noteon') {
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

function saveScene(io: Server, name: string, oscAddress: string, state: number[]) {
    const existingSceneIndex = scenes.findIndex(s => s.name === name);
    const newScene: Scene = { 
        name, 
        channelValues: Array.isArray(state) ? state : Object.values(state), 
        oscAddress 
    };
    if (existingSceneIndex !== -1) {
        scenes[existingSceneIndex] = newScene;
    } else {
        scenes.push(newScene);
    }
    saveScenes();
    io.emit('sceneSaved', name);
    io.emit('sceneList', scenes);
    log(`Scene saved: ${JSON.stringify(newScene)}`);
}

function loadScene(io: Server, name: string) {
    const scene = scenes.find(s => s.name === name);
    if (scene) {
        let channelValues: number[];
        if (Array.isArray(scene.channelValues)) {
            channelValues = scene.channelValues;
        } else if (typeof scene.channelValues === 'object') {
            channelValues = Object.values(scene.channelValues);
        } else {
            log(`Error loading scene ${name}: Invalid channelValues format`);
            io.emit('sceneLoadError', { name, error: 'Invalid channelValues format' });
            return;
        }

        channelValues.forEach((value, index) => {
            if (index < dmxChannels.length) {
                updateDmxChannel(index, value);
            }
        });
        io.emit('sceneLoaded', { name, channelValues });
        log(`Scene loaded: ${name}`);
    } else {
        log(`Error loading scene ${name}: Scene not found`);
        io.emit('sceneLoadError', { name, error: 'Scene not found' });
    }
}

function updateDmxChannel(channel: number, value: number) {
    dmxChannels[channel] = value;
    if (artnetSender) {
        artnetSender.setChannel(channel, value);
        artnetSender.transmit();
        log(`DMX channel ${channel} set to ${value}`);
    } else {
        log('ArtNet sender not initialized');
    }
}

function saveScenes(scenesToSave?: Scene[]) {
    if (scenesToSave) {
        scenes = scenesToSave;
    }
    const scenesJson = JSON.stringify(scenes, null, 2);
    log('Saving scenes: ' + scenesJson);
    fs.writeFileSync(SCENES_FILE, scenesJson);
    log('Scenes saved to file');
}

function loadScenes() {
    if (fs.existsSync(SCENES_FILE)) {
        const data = fs.readFileSync(SCENES_FILE, 'utf-8');
        log('Raw scenes data from file: ' + data);
        scenes = JSON.parse(data);
        log('Scenes loaded: ' + JSON.stringify(scenes));
        return scenes;
    } else {
        scenes = [];
        saveScenes();
        return scenes;
    }
}

function pingArtNetDevice(io: Server, ip?: string) {
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
            log(`ArtNet device at ${targetIp} is alive`);
            io.emit('artnetStatus', { ip: targetIp, status: 'alive' });
        })
        .catch((error) => {
            // Don't treat connection failures as errors, just report device as unreachable
            log(`ArtNet device at ${targetIp} is unreachable: ${error.message}`);
            io.emit('artnetStatus', { 
                ip: targetIp, 
                status: 'unreachable',
                message: 'Device is not responding on ArtNet port'
            });
        });
}

function startLaserTime(io: Server) {
    loadConfig();
    loadScenes();
    
    // Check if we're in WSL and log special message about browser MIDI
    if (isRunningInWsl()) {
        log('Starting in WSL environment - hardware MIDI devices unavailable');
        log('Users can still use Web MIDI API from browsers');
    }
    
    initializeMidi(io);
    initOsc(io);
    initializeArtNet();

    // Start pinging ArtNet device every 5 seconds
    setInterval(() => pingArtNetDevice(io), 5000);

    io.on('connection', (socket: Socket) => {
        log('A user connected');
        
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

        socket.on('setDmxChannel', ({ channel, value }: { channel: number; value: number }) => {
            log(`Setting DMX channel ${channel} to value ${value}`);
            updateDmxChannel(channel, value);
            io.emit('dmxUpdate', { channel, value });
        });

        socket.on('saveScene', ({ name, oscAddress, state }: { name: string; oscAddress: string; state: number[] }) => {
            log(`Saving scene: ${name}`);
            saveScene(io, name, oscAddress, state);
        });

        socket.on('loadScene', ({ name }: { name: string }) => {
            log(`Loading scene: ${name}`);
            loadScene(io, name);
        });
        
        // MIDI learn mode handler for the startMidiLearn event
        socket.on('startMidiLearn', ({ channel }: { channel: number }) => {
            log(`Starting MIDI learn for channel ${channel}`);
            
            // If already in learn mode, cancel it first
            if (currentMidiLearnChannel !== null) {
                log(`Cancelling previous MIDI learn for channel ${currentMidiLearnChannel}`);
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
                    log(`MIDI learn for channel ${currentMidiLearnChannel} timed out`);
                    currentMidiLearnChannel = null;
                    io.emit('midiLearnTimeout', { channel });
                }
            }, 30000);
            
            io.emit('midiLearnStarted', { channel });
        });
        
        // CRITICAL FIX: Add handler for learnMidiMapping event
        socket.on('learnMidiMapping', ({ channel }: { channel: number }) => {
            log(`Starting MIDI learn for channel ${channel} (via learnMidiMapping event)`);
            
            // If already in learn mode, cancel it first
            if (currentMidiLearnChannel !== null) {
                log(`Cancelling previous MIDI learn for channel ${currentMidiLearnChannel}`);
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
                    log(`MIDI learn for channel ${currentMidiLearnChannel} timed out`);
                    currentMidiLearnChannel = null;
                    io.emit('midiLearnTimeout', { channel });
                }
            }, 30000);
            
            io.emit('midiLearnStarted', { channel });
            log(`MIDI learn mode ACTIVE for channel ${channel} - awaiting MIDI input...`);
        });

        // Handle browser MIDI messages
        socket.on('browserMidiMessage', (msg: MidiMessage) => {
            log(`Received browser MIDI message: ${JSON.stringify(msg)}`);
            // Forward the message to all clients to maintain MIDI visualization
            io.emit('midiMessage', msg);
            
            // Process the message the same way we would for hardware MIDI
            if (msg._type === 'noteon' || msg._type === 'cc') {
                handleMidiMessage(io, msg._type as 'noteon' | 'cc', msg);
            }
        });

        socket.on('disconnect', () => {
            log('User disconnected');
        });
    });
}

// Export all necessary functions
// We don't need this separate function since we're integrating it directly into startLaserTime
function addSocketHandlers(io: Server) {
    // This is just a placeholder now - all handlers are set up in startLaserTime
    log('Socket handlers being initialized (via addSocketHandlers)');
}

// Create a clearMidiMappings function
function clearMidiMappings(channelToRemove?: number) {
    if (channelToRemove !== undefined) {
        // Remove a specific channel mapping
        if (channelToRemove in midiMappings) {
            delete midiMappings[channelToRemove];
        }
    } else {
        // Clear all mappings
        midiMappings = {};
    }
}

// Create an updateArtNetConfig function
function updateArtNetConfig(config: Partial<ArtNetConfig>) {
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
        } catch (error) {
            log(`Error reinitializing ArtNet with new config: ${error}`);
        }
    }
}

export {
    log,
    listMidiInterfaces,
    simulateMidiInput,
    learnMidiMapping,
    loadConfig,
    saveConfig,
    initOsc,
    startLaserTime,
    connectMidiInput,
    disconnectMidiInput,
    addSocketHandlers,
    // Export additional functions needed by the API
    updateDmxChannel as setDmxChannel,
    loadScene,
    saveScene,
    loadScenes,
    saveScenes,
    pingArtNetDevice,
    // New exports
    clearMidiMappings,
    updateArtNetConfig
};
