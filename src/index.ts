import easymidi, { Input, MidiMessage } from 'easymidi';
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

interface Scene {
    name: string;
    channelValues: number[];
    oscAddress: string;
}

interface MidiMapping {
    channel: number;
    note?: number;
    controller?: number;
}

type MidiMappings = { [dmxChannel: number]: MidiMapping };

type ExtendedMidiMessage = Partial<MidiMessage> & (
    | { _type: 'noteon'; channel: number; note: number; velocity: number }
    | { _type: 'noteoff'; channel: number; note: number; velocity: number }
    | { _type: 'cc'; channel: number; controller: number; value: number }
    | { _type: 'program'; channel: number; number: number }
    | { _type: 'channel aftertouch'; channel: number; pressure: number }
    | { _type: 'pitch'; channel: number; value: number }
    | { _type: 'position'; value: number }
    | { _type: 'select'; song: number }
    | { _type: 'clock' | 'start' | 'continue' | 'stop' }
);

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

function listMidiInterfaces() {
    const inputs = easymidi.getInputs();
    const outputs = easymidi.getOutputs();
    log("Available MIDI Inputs: " + JSON.stringify(inputs));
    log("Available MIDI Outputs: " + JSON.stringify(outputs));
    return { inputs, outputs };
}

function initializeMidi(io: Server) {
    const inputs = easymidi.getInputs();
    if (inputs.length > 0) {
        midiInput = new easymidi.Input(inputs[0]);
        midiInput.on('noteon', (msg) => handleMidiMessage(io, 'noteon', msg));
        midiInput.on('cc', (msg) => handleMidiMessage(io, 'cc', msg));
        log(`MIDI input initialized: ${inputs[0]}`);
    } else {
        log('No MIDI inputs available');
    }
}

function handleMidiMessage(io: Server, type: 'noteon' | 'cc', msg: any) {
    if (currentMidiLearnChannel !== null) {
        const mapping: MidiMapping = {
            channel: msg.channel,
            [type === 'noteon' ? 'note' : 'controller']: msg[type === 'noteon' ? 'note' : 'controller']
        };
        midiMappings[currentMidiLearnChannel] = mapping;
        io.emit('midiMappingLearned', { channel: currentMidiLearnChannel, mapping });
        log(`MIDI mapping learned for channel ${currentMidiLearnChannel}: ${JSON.stringify(mapping)}`);
        currentMidiLearnChannel = null;
    } else {
        // Handle regular MIDI input
        Object.entries(midiMappings).forEach(([channel, mapping]) => {
            if (mapping.channel === msg.channel &&
                ((type === 'noteon' && mapping.note === msg.note) ||
                (type === 'cc' && mapping.controller === msg.controller))) {
                const value = type === 'noteon' ? msg.velocity : msg.value;
                updateDmxChannel(parseInt(channel), value);
                io.emit('dmxUpdate', { channel: parseInt(channel), value });
            }
        });
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

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsedConfig = JSON.parse(data);
        artNetConfig = { ...artNetConfig, ...parsedConfig.artNetConfig };
        midiMappings = parsedConfig.midiMappings || {};
        log('Config loaded: ' + JSON.stringify(artNetConfig));
        log('MIDI mappings loaded: ' + JSON.stringify(midiMappings));
    } else {
        saveConfig();
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

function loadScenes() {
    if (fs.existsSync(SCENES_FILE)) {
        const data = fs.readFileSync(SCENES_FILE, 'utf-8');
        log('Raw scenes data from file: ' + data);
        scenes = JSON.parse(data);
        log('Scenes loaded: ' + JSON.stringify(scenes));
    } else {
        scenes = [];
        saveScenes();
    }
}

function saveScenes() {
    const scenesToSave = JSON.stringify(scenes, null, 2);
    log('Saving scenes: ' + scenesToSave);
    fs.writeFileSync(SCENES_FILE, scenesToSave);
    log('Scenes saved to file');
    
    // Verify the file was written correctly
    const savedData = fs.readFileSync(SCENES_FILE, 'utf-8');
    log('Verified saved scenes: ' + savedData);
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

function simulateMidiInput(io: Server, type: 'noteon' | 'cc', channel: number, note: number, velocity: number) {
    handleMidiMessage(io, type, { channel, [type === 'noteon' ? 'note' : 'controller']: note, [type === 'noteon' ? 'velocity' : 'value']: velocity });
}

function learnMidiMapping(io: Server, dmxChannel: number, midiMapping: MidiMapping) {
    midiMappings[dmxChannel] = midiMapping;
    io.emit('midiMappingLearned', { channel: dmxChannel, mapping: midiMapping });
    log(`MIDI mapping learned for channel ${dmxChannel}: ${JSON.stringify(midiMapping)}`);
}

function startLaserTime(io: Server) {
    loadConfig();
    loadScenes();
    initializeMidi(io);
    initOsc(io);
    initializeArtNet();

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

        socket.on('updateOscAssignment', ({ channel, oscAddress }: { channel: number; oscAddress: string }) => {
            log(`Updating OSC assignment for channel ${channel} to ${oscAddress}`);
            oscAssignments[channel] = oscAddress;
            io.emit('oscAssignmentUpdated', { channel, oscAddress });
        });

        socket.on('updateChannelName', ({ channel, name }: { channel: number; name: string }) => {
            log(`Updating name for channel ${channel} to ${name}`);
            channelNames[channel] = `CH ${channel + 1} ${name}`;
            io.emit('channelNameUpdated', { channel, name: channelNames[channel] });
        });

        socket.on('startMidiLearn', ({ channel }: { channel: number }) => {
            log(`Starting MIDI learn for channel ${channel}`);
            currentMidiLearnChannel = channel;
            if (midiLearnTimeout) {
                clearTimeout(midiLearnTimeout);
            }
            midiLearnTimeout = setTimeout(() => {
                if (currentMidiLearnChannel !== null) {
                    log(`MIDI learn timed out for channel ${currentMidiLearnChannel}`);
                    currentMidiLearnChannel = null;
                    socket.emit('midiLearnTimeout', { channel });
                }
            }, 10000); // 10 seconds timeout
        });

        socket.on('forgetMidiMapping', ({ channel }: { channel: number }) => {
            log(`Forgetting MIDI mapping for channel ${channel}`);
            delete midiMappings[channel];
            io.emit('midiMappingForgotten', { channel });
        });

        socket.on('disconnect', () => {
            log('User disconnected');
        });
    });
}

// Export all necessary functions
export {
    log,
    listMidiInterfaces,
    simulateMidiInput,
    learnMidiMapping,
    loadConfig,
    saveConfig,
    initOsc,
    startLaserTime
};
