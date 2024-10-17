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

function initializeMidi(io: Server) {
    const inputs = easymidi.getInputs();
    if (inputs.length > 0) {
        midiInput = new easymidi.Input(inputs[0]);
        midiInput.on('noteon', (msg: MidiMessage) => handleMidiMessage(io, 'noteon', msg));
        midiInput.on('cc', (msg: MidiMessage) => handleMidiMessage(io, 'cc', msg));
        log(`MIDI input initialized: ${inputs[0]}`);
    } else {
        log('No MIDI inputs available');
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
    const inputs = easymidi.getInputs();
    const outputs = easymidi.getOutputs();
    log("Available MIDI Inputs: " + JSON.stringify(inputs));
    log("Available MIDI Outputs: " + JSON.stringify(outputs));
    return { inputs, outputs };
}

function simulateMidiInput(io: Server, type: 'noteon' | 'cc', channel: number, note: number, velocity: number) {
    let midiMessage: MidiMessage;
    if (type === 'noteon') {
        midiMessage = {
            _type: 'noteon',
            channel: channel,
            note: note,
            velocity: velocity
        } as unknown as MidiMessage;
    } else {
        midiMessage = {
            _type: 'cc',
            channel: channel,
            controller: note,
            value: velocity
        } as unknown as MidiMessage;
    }
    handleMidiMessage(io, type, midiMessage);
}

function learnMidiMapping(io: Server, dmxChannel: number, midiMapping: MidiMapping) {
    midiMappings[dmxChannel] = midiMapping;
    io.emit('midiMappingLearned', { channel: dmxChannel, mapping: midiMapping });
    log(`MIDI mapping learned for channel ${dmxChannel}: ${JSON.stringify(midiMapping)}`);
}

function handleMidiMessage(io: Server, type: 'noteon' | 'cc', msg: MidiMessage) {
    // Implementation of handleMidiMessage function
    // This should be already defined in your existing code
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

function saveScenes() {
    const scenesToSave = JSON.stringify(scenes, null, 2);
    log('Saving scenes: ' + scenesToSave);
    fs.writeFileSync(SCENES_FILE, scenesToSave);
    log('Scenes saved to file');
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

function pingArtNetDevice(io: Server) {
    ping.promise.probe(artNetConfig.ip)
        .then((res: any) => {
            const status = res.alive ? 'alive' : 'unreachable';
            log(`ArtNet device at ${artNetConfig.ip} is ${status}`);
            io.emit('artnetStatus', { ip: artNetConfig.ip, status });
        })
        .catch((error: any) => {
            log(`Error pinging ArtNet device: ${error}`);
            io.emit('artnetStatus', { ip: artNetConfig.ip, status: 'error', error: error.message });
        });
}

function startLaserTime(io: Server) {
    loadConfig();
    loadScenes();
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
