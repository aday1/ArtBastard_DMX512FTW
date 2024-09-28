import easymidi, { Input, MidiMessage } from 'easymidi';
import { Server, Socket } from 'socket.io';
import os from 'os';
import { UDPPort, OscMessage } from 'osc';
import fs from 'fs';
import path from 'path';
import EffectsEngine from './effects';
import ping from 'ping';

// Use require for dmxnet
const dmxnet = require('dmxnet');

// Type definitions
interface Scene {
    name: string;
    channelValues: number[];
    oscAddress: string;
}

interface Fixture {
    name: string;
    startAddress: number;
    channels: { name: string; type: string }[];
}

interface Group {
    name: string;
    fixtureIndices: number[];
}

interface ArtNetConfig {
    ip: string;
    subnet: number;
    universe: number;
    net: number;
    port: number;
    base_refresh_interval: number;
}

interface ExportableConfig {
    artNetConfig: ArtNetConfig;
    scenes: Scene[];
    fixtures: Fixture[];
    groups: Group[];
    midiMappings: MidiMappings;
}

interface MidiMapping {
    channel: number;
    note: number;
}

type MidiMappings = { [dmxChannel: number]: MidiMapping };

// Define a type for the dmxnet instance
interface DmxnetInstance {
    newSender: (config: ArtNetConfig) => any;
}

// Variable declarations
let dmxChannels: number[] = new Array(512).fill(0);
let fixtures: Fixture[] = [];
let groups: Group[] = [];
let scenes: Scene[] = [];
let sender: any = null;
let midiMappings: MidiMappings = {};
let midiInput: Input | null = null;

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCENES_FILE = path.join(DATA_DIR, 'scenes.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const EXPORT_FILE = path.join(DATA_DIR, 'export_config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default ArtNet configuration
let artNetConfig: ArtNetConfig = {
    ip: "192.168.1.199",
    subnet: 0,
    universe: 0,
    net: 0,
    port: 6454,
    base_refresh_interval: 1000
};

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsedConfig = JSON.parse(data);
        artNetConfig = { ...artNetConfig, ...parsedConfig.artNetConfig };
        midiMappings = parsedConfig.midiMappings || {};
        console.log('Config loaded:', artNetConfig);
        console.log('MIDI mappings loaded:', midiMappings);
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
    console.log('Config saved:', configToSave);
}

function exportConfig() {
    const exportableConfig: ExportableConfig = {
        artNetConfig,
        scenes,
        fixtures,
        groups,
        midiMappings
    };
    fs.writeFileSync(EXPORT_FILE, JSON.stringify(exportableConfig, null, 2));
    console.log('Config exported to:', EXPORT_FILE);
    return EXPORT_FILE;
}

function importConfig(importedConfig: ExportableConfig) {
    artNetConfig = importedConfig.artNetConfig;
    scenes = importedConfig.scenes;
    fixtures = importedConfig.fixtures;
    groups = importedConfig.groups;
    midiMappings = importedConfig.midiMappings;
    saveConfig();
    saveScenes();
    console.log('Config imported and saved');
}

function listMidiInterfaces() {
    const inputs = easymidi.getInputs();
    const outputs = easymidi.getOutputs();
    console.log("Available MIDI Inputs:", inputs);
    console.log("Available MIDI Outputs:", outputs);
    return { inputs, outputs };
}

function initOsc(io: Server) {
    // Implementation of initOsc function
    // This should be already defined in your existing code
}

function getDmxStateWithFixtures() {
    return {
        dmxChannels,
        fixtures: fixtures.map(fixture => ({
            ...fixture,
            channelValues: fixture.channels.map((_, index) => dmxChannels[fixture.startAddress + index])
        })),
        groups,
        midiMappings
    };
}

function saveScene(name: string): Scene {
    const scene: Scene = {
        name,
        channelValues: [...dmxChannels],
        oscAddress: `SCENE/${scenes.length}`
    };
    scenes.push(scene);
    saveScenes();
    console.log(`Scene saved: ${name}`);
    return scene;
}

function saveScenes() {
    fs.writeFileSync(SCENES_FILE, JSON.stringify(scenes, null, 2));
    console.log(`Scenes saved to ${SCENES_FILE}`);
}

function loadScenes() {
    if (fs.existsSync(SCENES_FILE)) {
        const data = fs.readFileSync(SCENES_FILE, 'utf-8');
        scenes = JSON.parse(data);
        console.log(`Scenes loaded from ${SCENES_FILE}`);
    } else {
        console.log(`No scenes file found at ${SCENES_FILE}`);
    }
}

function deleteScene(name: string): boolean {
    const initialLength = scenes.length;
    scenes = scenes.filter(scene => scene.name !== name);
    if (scenes.length < initialLength) {
        saveScenes();
        console.log(`Scene deleted: ${name}`);
        return true;
    }
    console.log(`Scene not found: ${name}`);
    return false;
}

function updateSceneOsc(name: string, oscAddress: string): boolean {
    const scene = scenes.find(s => s.name === name);
    if (scene) {
        scene.oscAddress = oscAddress;
        saveScenes();
        console.log(`Scene OSC updated: ${name}, new OSC: ${oscAddress}`);
        return true;
    }
    console.log(`Scene not found for OSC update: ${name}`);
    return false;
}

function learnMidiMapping(dmxChannel: number, midiChannel: number, note: number) {
    midiMappings[dmxChannel] = { channel: midiChannel, note: note };
    saveConfig();
    console.log(`MIDI mapping learned for DMX channel ${dmxChannel}: Channel ${midiChannel}, Note ${note}`);
    return true;
}

function forgetMidiMapping(dmxChannel: number) {
    if (midiMappings[dmxChannel]) {
        delete midiMappings[dmxChannel];
        saveConfig();
        console.log(`MIDI mapping forgotten for DMX channel ${dmxChannel}`);
        return true;
    }
    console.log(`No MIDI mapping found for DMX channel ${dmxChannel}`);
    return false;
}

async function getArtNetDiagnostics() {
    try {
        const pingResult = await ping.promise.probe(artNetConfig.ip);
        return {
            ip: artNetConfig.ip,
            universe: artNetConfig.universe,
            status: sender ? (sender.is_transmitting ? 'Active' : 'Inactive') : 'Not initialized',
            channelsTransmitted: dmxChannels.filter(val => val > 0).length,
            totalChannels: dmxChannels.length,
            pingStatus: pingResult.alive ? 'Reachable' : 'Unreachable',
            pingTime: pingResult.time
        };
    } catch (error) {
        console.error('Error getting ArtNET diagnostics:', error);
        return {
            error: 'Failed to retrieve ArtNET diagnostics',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

export function startLaserTime(io: Server) {
    loadConfig();
    const { inputs } = listMidiInterfaces();
    io.emit('midiInterfaces', inputs);

    initOsc(io);

    // Load saved scenes
    loadScenes();

    // Initialize ArtNet sender
    let dmxnetInstance: DmxnetInstance;
    if (typeof dmxnet === 'function') {
        dmxnetInstance = dmxnet({
            log: { level: 'info' },
        });
    } else if (typeof dmxnet === 'object' && typeof dmxnet.dmxnet === 'function') {
        dmxnetInstance = new dmxnet.dmxnet({
            log: { level: 'info' },
        });
    } else {
        console.error('Unable to initialize dmxnet. Please check the library.');
        return;
    }

    sender = dmxnetInstance.newSender(artNetConfig);

    // Initialize the EffectsEngine
    const effectsEngine = new EffectsEngine(io);
    effectsEngine.startEffectsLoop();

    io.on('connection', (socket: Socket) => {
        // Send initial DMX state with fixtures and groups
        socket.emit('initialState', getDmxStateWithFixtures());

        // Send the list of scenes to the client
        socket.emit('sceneList', scenes.map(scene => ({ name: scene.name, oscAddress: scene.oscAddress })));

        // Send ArtNet configuration
        socket.emit('artNetConfig', artNetConfig);

        socket.on('saveScene', (name: string) => {
            console.log(`Received saveScene request: ${name}`);
            const scene = saveScene(name);
            // Emit the new scene to all connected clients
            io.emit('sceneAdded', { name: scene.name, oscAddress: scene.oscAddress });
            // Also emit the updated scene list to all clients
            io.emit('sceneListUpdated', scenes.map(s => ({ name: s.name, oscAddress: s.oscAddress })));
            console.log(`Emitted sceneAdded and sceneListUpdated events: ${scene.name}`);
        });

        socket.on('loadScene', (name: string) => {
            const scene = scenes.find(s => s.name === name);
            if (scene) {
                dmxChannels = [...scene.channelValues];
                // Update DMX values
                for (let i = 0; i < dmxChannels.length; i++) {
                    sender?.setChannel(i, dmxChannels[i]);
                }
                // Emit the updated DMX state to all connected clients
                io.emit('dmxStateUpdated', getDmxStateWithFixtures());
                io.emit('sceneLoaded', { name: scene.name, channelValues: scene.channelValues });
                console.log(`Scene loaded and DMX state updated: ${name}`);
            } else {
                socket.emit('error', { message: `Scene not found: ${name}` });
            }
        });

        socket.on('deleteScene', (name: string) => {
            console.log(`Received deleteScene request: ${name}`);
            if (deleteScene(name)) {
                // Emit the deleted scene name to all connected clients
                io.emit('sceneDeleted', name);
                // Also emit the updated scene list to all clients
                io.emit('sceneListUpdated', scenes.map(s => ({ name: s.name, oscAddress: s.oscAddress })));
                console.log(`Emitted sceneDeleted and sceneListUpdated events: ${name}`);
            } else {
                socket.emit('error', { message: `Failed to delete scene: ${name}` });
            }
        });

        socket.on('updateSceneOsc', ({ name, oscAddress }) => {
            console.log(`Received updateSceneOsc request: ${name}, ${oscAddress}`);
            if (updateSceneOsc(name, oscAddress)) {
                // Emit the updated scene to all connected clients
                io.emit('sceneOscUpdated', { name, oscAddress });
                // Also emit the updated scene list to all clients
                io.emit('sceneListUpdated', scenes.map(s => ({ name: s.name, oscAddress: s.oscAddress })));
                console.log(`Emitted sceneOscUpdated and sceneListUpdated events: ${name}`);
            } else {
                socket.emit('error', { message: `Failed to update OSC for scene: ${name}` });
            }
        });

        socket.on('updateArtNetConfig', (config: Partial<ArtNetConfig>) => {
            artNetConfig = { ...artNetConfig, ...config };
            saveConfig();
            sender?.close();
            sender = dmxnetInstance.newSender(artNetConfig);
            io.emit('artNetConfig', artNetConfig);
        });

        socket.on('exportConfig', () => {
            const exportPath = exportConfig();
            socket.emit('configExported', { path: exportPath });
        });

        socket.on('importConfig', (importedConfig: ExportableConfig) => {
            importConfig(importedConfig);
            io.emit('configImported', getDmxStateWithFixtures());
            io.emit('sceneList', scenes.map(scene => ({ name: scene.name, oscAddress: scene.oscAddress })));
            io.emit('artNetConfig', artNetConfig);
        });

        socket.on('midiLearned', ({ dmxChannel, midiMapping }) => {
            console.log(`Received MIDI learn request: DMX Channel ${dmxChannel}, MIDI Mapping: ${JSON.stringify(midiMapping)}`);
            if (learnMidiMapping(dmxChannel, midiMapping.channel, midiMapping.note)) {
                io.emit('midiLearned', { dmxChannel, midiMapping });
            } else {
                socket.emit('error', { message: `Failed to learn MIDI mapping for DMX channel ${dmxChannel}` });
            }
        });

        socket.on('forgetMidi', (dmxChannel: number) => {
            console.log(`Received forgetMidi request for DMX channel ${dmxChannel}`);
            if (forgetMidiMapping(dmxChannel)) {
                io.emit('midiMappingForgotten', dmxChannel);
            } else {
                socket.emit('error', { message: `No MIDI mapping found for DMX channel ${dmxChannel}` });
            }
        });

        // New effect-related socket events
        socket.on('addEffect', (effect) => {
            effectsEngine.addEffect(effect);
        });

        socket.on('removeEffect', (effectId) => {
            effectsEngine.removeEffect(effectId);
        });

        socket.on('applyEffect', ({ effectId, target }) => {
            effectsEngine.applyEffect(effectId, target);
        });

        socket.on('removeEffectFromTarget', ({ effectId, target }) => {
            effectsEngine.removeEffectFromTarget(effectId, target);
        });
    });

    // Emit ArtNET diagnostics periodically
    setInterval(async () => {
        const diagnostics = await getArtNetDiagnostics();
        io.emit('artnetDiagnostics', diagnostics);
    }, 5000);

    // Clean up effects engine on server shutdown
    process.on('SIGINT', () => {
        effectsEngine.stopEffectsLoop();
        if (sender) {
            sender.close();
        }
        process.exit();
    });
}

export {
    loadConfig,
    saveConfig,
    exportConfig,
    importConfig,
    listMidiInterfaces,
    initOsc,
    getDmxStateWithFixtures,
    saveScene,
    saveScenes,
    loadScenes,
    deleteScene,
    updateSceneOsc,
    getArtNetDiagnostics
};
