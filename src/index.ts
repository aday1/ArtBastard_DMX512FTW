import easymidi, { Input } from 'easymidi';
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

// Extend the MidiMessage type from easymidi
interface MidiMessage {
    _type: string;
    channel: number;
    note?: number;
    velocity?: number;
    value?: number;
    controller?: number;
}

interface ExtendedMidiMessage extends MidiMessage {
    _type: 'noteon' | 'cc';
}

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
    const { inputs } = listMidiInterfaces();
    if (inputs.length > 0) {
        try {
            midiInput = new easymidi.Input(inputs[0]);
            log(`Connected to MIDI input: ${inputs[0]}`);

            midiInput.on('noteon', (msg: MidiMessage) => {
                const extendedMsg: ExtendedMidiMessage = { ...msg, _type: 'noteon' };
                log(`MIDI Note On received: ${JSON.stringify(extendedMsg)}`);
                io.emit('midiMessage', extendedMsg);
                handleMidiLearn(extendedMsg);
            });

            midiInput.on('cc', (msg: MidiMessage) => {
                const extendedMsg: ExtendedMidiMessage = { ...msg, _type: 'cc', value: msg.value };
                log(`MIDI CC received: ${JSON.stringify(extendedMsg)}`);
                io.emit('midiMessage', extendedMsg);
                handleMidiLearn(extendedMsg);
            });

            io.emit('midiInputsAvailable', inputs);
        } catch (error) {
            log(`Error initializing MIDI input: ${error}`);
            io.emit('error', { message: 'Failed to initialize MIDI input' });
        }
    } else {
        log('No MIDI inputs available');
        io.emit('error', { message: 'No MIDI inputs available' });
    }
}

function handleMidiLearn(msg: ExtendedMidiMessage) {
    if (currentMidiLearnChannel !== null) {
        const midiMapping: MidiMapping = {
            channel: msg.channel,
            note: msg._type === 'noteon' ? msg.note : undefined,
            controller: msg._type === 'cc' ? msg.controller : undefined
        };
        learnMidiMapping(currentMidiLearnChannel, midiMapping);
        currentMidiLearnChannel = null;
        if (midiLearnTimeout) {
            clearTimeout(midiLearnTimeout);
            midiLearnTimeout = null;
        }
    }
}

function learnMidiMapping(dmxChannel: number, midiMapping: MidiMapping) {
    midiMappings[dmxChannel] = midiMapping;
    saveConfig();
    log(`MIDI mapping learned for DMX channel ${dmxChannel}: ${JSON.stringify(midiMapping)}`);
    return true;
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

function initOsc(io: Server) {
    // Implementation of initOsc function
    // This should be already defined in your existing code
}

function initializeArtNet() {
    try {
        const dmxnetInstance = new dmxnet.dmxnet({
            oem: 0,
            esta: 0,
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

function simulateMidiInput(io: Server, type: 'noteon' | 'cc', channel: number, note: number, velocity: number) {
    const msg: ExtendedMidiMessage = {
        _type: type,
        channel,
        note,
        velocity,
        value: velocity
    };

    if (type === 'cc') {
        msg.controller = note;
        delete msg.note;
        delete msg.velocity;
    }

    log(`Simulated MIDI ${type} received: ${JSON.stringify(msg)}`);
    io.emit('midiMessage', msg);
    handleMidiLearn(msg);
}

function startLaserTime(io: Server) {
    loadConfig();
    initializeMidi(io);
    initOsc(io);
    initializeArtNet();

    io.on('connection', (socket: Socket) => {
        log('A user connected');
        
        // Send initial state to the client
        socket.emit('initialState', {
            dmxChannels,
            fixtures,
            groups,
            midiMappings,
            artNetConfig
        });

        // Send available MIDI inputs to the client
        const { inputs } = listMidiInterfaces();
        socket.emit('midiInputsAvailable', inputs);

        socket.on('requestMidiInputs', () => {
            const { inputs } = listMidiInterfaces();
            socket.emit('midiInputsAvailable', inputs);
        });

        socket.on('selectMidiInput', (inputId: string) => {
            const { inputs } = listMidiInterfaces();
            const selectedInput = inputs.find(input => input === inputId);
            if (selectedInput) {
                if (midiInput) {
                    midiInput.close();
                }
                midiInput = new easymidi.Input(selectedInput);
                log(`Connected to MIDI input: ${selectedInput}`);
                socket.emit('midiInputSelected', selectedInput);
            } else {
                log(`Invalid MIDI input selected: ${inputId}`);
                socket.emit('error', { message: 'Invalid MIDI input selected' });
            }
        });

        socket.on('startMidiLearn', (dmxChannel: number) => {
            log(`Starting MIDI learn for DMX channel ${dmxChannel}`);
            currentMidiLearnChannel = dmxChannel;
            if (midiLearnTimeout) {
                clearTimeout(midiLearnTimeout);
            }
            midiLearnTimeout = setTimeout(() => {
                if (currentMidiLearnChannel !== null) {
                    log('MIDI learn timeout');
                    currentMidiLearnChannel = null;
                    io.emit('midiLearnTimeout', dmxChannel);
                }
            }, 10000); // 10 seconds timeout
            io.emit('midiLearnStarted', dmxChannel);
        });

        socket.on('setDmxChannel', ({ channel, value }) => {
            log(`Setting DMX channel ${channel} to value ${value}`);
            updateDmxChannel(channel, value);
            io.emit('dmxUpdate', { channel, value });
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
