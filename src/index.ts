import dmxlib, { PollData } from 'dmxnet';
import easymidi, { Input, MidiMessage } from 'easymidi';
import { Server, Socket } from 'socket.io';
import os from 'os';
import { UDPPort, OscMessage } from 'osc';
import fs from 'fs';
import path from 'path';

const dmxnet = new dmxlib.dmxnet({
    log: { level: 'info' },
});

const sender = dmxnet.newSender({
    ip: "192.168.1.199",
    subnet: 0,
    universe: 0,
    net: 0,
    port: 6454,
    base_refresh_interval: 1000
});

// Keep track of DMX channel values, names, and OSC addresses
let dmxChannels = new Array(512).fill(0);
let dmxChannelNames = new Array(512).fill('');
let dmxChannelOscAddresses = new Array(512).fill('');

// MIDI mapping
let midiToDmxMapping: { [key: string]: number } = {};
let midiLearningTarget: number | null = null;

// Scene management
interface Scene {
    name: string;
    channelValues: number[];
    oscAddress: string;
}

let scenes: Scene[] = [];

// Fixture management
interface FixtureChannel {
    name: string;
    type: 'intensity' | 'pan' | 'tilt' | 'color' | 'gobo' | 'other';
}

interface Fixture {
    name: string;
    startAddress: number;
    channels: FixtureChannel[];
}

let fixtures: Fixture[] = [];

// Group management
interface Group {
    name: string;
    fixtureIndices: number[];
}

let groups: Group[] = [];

// OSC settings
let oscSettings = {
    inputPort: 3333,
    outputPort: 3334,
    outputAddress: '127.0.0.1'
};

let oscUdpPort: UDPPort;
let midiInput: Input | null = null;

const DATA_DIR = path.join(__dirname, '..', 'data');
const MIDI_MAPPINGS_FILE = path.join(DATA_DIR, 'midi_mappings.json');
const SCENES_FILE = path.join(DATA_DIR, 'scenes.json');
const FIXTURES_FILE = path.join(DATA_DIR, 'fixtures.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const ALL_SETTINGS_FILE = path.join(DATA_DIR, 'all_settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function saveMidiMappings() {
    fs.writeFileSync(MIDI_MAPPINGS_FILE, JSON.stringify(midiToDmxMapping, null, 2));
}

function loadMidiMappings() {
    if (fs.existsSync(MIDI_MAPPINGS_FILE)) {
        const data = fs.readFileSync(MIDI_MAPPINGS_FILE, 'utf-8');
        midiToDmxMapping = JSON.parse(data);
    }
}

function saveScenes() {
    fs.writeFileSync(SCENES_FILE, JSON.stringify(scenes, null, 2));
}

function loadScenes() {
    if (fs.existsSync(SCENES_FILE)) {
        const data = fs.readFileSync(SCENES_FILE, 'utf-8');
        scenes = JSON.parse(data);
    }
}

function saveFixtures() {
    fs.writeFileSync(FIXTURES_FILE, JSON.stringify(fixtures, null, 2));
}

function loadFixtures() {
    if (fs.existsSync(FIXTURES_FILE)) {
        const data = fs.readFileSync(FIXTURES_FILE, 'utf-8');
        fixtures = JSON.parse(data);
    }
}

function saveGroups() {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
}

function loadGroups() {
    if (fs.existsSync(GROUPS_FILE)) {
        const data = fs.readFileSync(GROUPS_FILE, 'utf-8');
        groups = JSON.parse(data);
    }
}

function saveAllSettings() {
    const allSettings = {
        midiToDmxMapping,
        scenes,
        fixtures,
        groups,
        oscSettings,
        dmxChannels,
        dmxChannelNames,
        dmxChannelOscAddresses
    };
    fs.writeFileSync(ALL_SETTINGS_FILE, JSON.stringify(allSettings, null, 2));
}

function loadAllSettings() {
    if (fs.existsSync(ALL_SETTINGS_FILE)) {
        const data = fs.readFileSync(ALL_SETTINGS_FILE, 'utf-8');
        const allSettings = JSON.parse(data);
        midiToDmxMapping = allSettings.midiToDmxMapping;
        scenes = allSettings.scenes;
        fixtures = allSettings.fixtures;
        groups = allSettings.groups;
        oscSettings = allSettings.oscSettings;
        dmxChannels = allSettings.dmxChannels;
        dmxChannelNames = allSettings.dmxChannelNames;
        dmxChannelOscAddresses = allSettings.dmxChannelOscAddresses;
    }
}

function nukeSettings() {
    midiToDmxMapping = {};
    scenes = [];
    fixtures = [];
    groups = [];
    dmxChannels = new Array(512).fill(0);
    dmxChannelNames = new Array(512).fill('');
    dmxChannelOscAddresses = new Array(512).fill('');
    
    // Delete all setting files
    [MIDI_MAPPINGS_FILE, SCENES_FILE, FIXTURES_FILE, GROUPS_FILE, ALL_SETTINGS_FILE].forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
}

// Load saved data on startup
loadAllSettings();

export function listMidiInterfaces() {
    const inputs = easymidi.getInputs();
    const outputs = easymidi.getOutputs();
    console.log("Available MIDI Inputs:", inputs);
    console.log("Available MIDI Outputs:", outputs);
    return { inputs, outputs };
}

function setDmxChannel(channel: number, value: number) {
    sender.setChannel(channel, value);
    dmxChannels[channel] = value;
}

function emitDmxUpdate(io: Server, channel: number, value: number) {
    io.emit('dmxUpdate', { channel, value });
}

function handleOscMessage(oscMsg: OscMessage, io: Server) {
    console.log("Received OSC message:", oscMsg);
    
    // Emit the OSC message to all connected clients
    io.emit('oscMessage', oscMsg);
    
    if (oscMsg.address.startsWith('/SCENE/')) {
        const sceneIndex = parseInt(oscMsg.address.split('/')[2]);
        if (!isNaN(sceneIndex) && sceneIndex >= 0 && sceneIndex < scenes.length) {
            const scene = scenes[sceneIndex];
            if (oscMsg.args && oscMsg.args.length > 0 && oscMsg.args[0] === 1) {  // Activate scene when value is 1
                console.log(`Activating scene: ${scene.name}`);
                transitionToScene(io, scene, 0);  // Instant transition
                io.emit('sceneActivated', scene.name);  // Emit scene activation event
            }
        }
    } else {
        const index = dmxChannelOscAddresses.indexOf(oscMsg.address);
        if (index !== -1 && oscMsg.args && oscMsg.args.length > 0) {
            const value = Math.min(Math.max(Math.floor(Number(oscMsg.args[0])), 0), 255);
            setDmxChannel(index, value);
            emitDmxUpdate(io, index, value);
        }
    }
}

function initOsc(io: Server) {
    if (oscUdpPort) {
        oscUdpPort.close();
    }

    oscUdpPort = new UDPPort({
        localAddress: "0.0.0.0",
        localPort: oscSettings.inputPort,
        remoteAddress: oscSettings.outputAddress,
        remotePort: oscSettings.outputPort
    });

    oscUdpPort.on("message", (oscMsg: OscMessage) => {
        handleOscMessage(oscMsg, io);
    });

    oscUdpPort.on("error", (err: Error) => {
        console.error("OSC error:", err);
    });

    oscUdpPort.open();
    console.log(`OSC listening on port ${oscSettings.inputPort}`);
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

function loadScene(sceneName: string): Scene | null {
    const scene = scenes.find(s => s.name === sceneName);
    if (scene) {
        console.log(`Scene loaded: ${sceneName}`);
        return scene;
    }
    console.log(`Scene not found: ${sceneName}`);
    return null;
}

function transitionToScene(io: Server, scene: Scene, duration: number) {
    const startValues = [...dmxChannels];
    const endValues = scene.channelValues;
    const startTime = Date.now();

    const updateInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        for (let i = 0; i < dmxChannels.length; i++) {
            const newValue = Math.round(startValues[i] + (endValues[i] - startValues[i]) * progress);
            setDmxChannel(i, newValue);
            emitDmxUpdate(io, i, newValue);
        }

        if (progress === 1) {
            clearInterval(updateInterval);
        }
    }, 50); // Update every 50ms for smooth transition
}

function getArtNetDiagnostics() {
    try {
        const senderInfo = sender as any; // Type assertion to bypass TypeScript checks
        return {
            ip: senderInfo.ip || 'Unknown',
            universe: senderInfo.universe || 0,
            status: senderInfo.is_transmitting ? 'Active' : 'Inactive',
            channelsTransmitted: dmxChannels.filter(val => val > 0).length,
            totalChannels: dmxChannels.length
        };
    } catch (error) {
        console.error('Error getting ArtNET diagnostics:', error);
        return {
            error: 'Failed to retrieve ArtNET diagnostics',
            details: error instanceof Error ? error.message : String(error)
        };
    }
}

function searchArtNetDevices(): Promise<{ name: string; ip: string }[]> {
    return new Promise((resolve) => {
        const devices: { name: string; ip: string }[] = [];
        const controller = (dmxnet as any).newController();

        controller.on('artnetPollReply', (reply: any) => {
            devices.push({
                name: reply.shortName || 'Unknown',
                ip: reply.ip
            });
        });

        controller.on('error', (error: Error) => {
            console.error('ArtNET search error:', error);
        });

        // Send ArtPoll request
        controller.sendArtPoll();

        // Resolve after 5 seconds (adjust this timeout as needed)
        setTimeout(() => {
            resolve(devices);
        }, 5000);
    });
}

function handleMidiMessage(msg: MidiMessage, io: Server) {
    if ('_type' in msg && msg._type === 'cc') {
        const midiKey = `${msg.controller}:${msg.value}`;
        
        // Emit MIDI message to all connected clients
        io.emit('midiMessage', msg);

        if (midiLearningTarget !== null) {
            midiToDmxMapping[midiKey] = midiLearningTarget;
            saveMidiMappings();
            io.emit('midiLearned', { midiKey, dmxChannel: midiLearningTarget });
            midiLearningTarget = null;
        } else if (midiKey in midiToDmxMapping) {
            const dmxChannel = midiToDmxMapping[midiKey];
            const dmxValue = Math.round((msg.value / 127) * 255);
            setDmxChannel(dmxChannel, dmxValue);
            emitDmxUpdate(io, dmxChannel, dmxValue);
        }
    }
}

function addFixture(fixture: Fixture): Fixture {
    fixtures.push(fixture);
    saveFixtures();
    return fixture;
}

function updateFixture(index: number, fixture: Fixture): Fixture {
    fixtures[index] = fixture;
    saveFixtures();
    return fixture;
}

function removeFixture(index: number): void {
    fixtures.splice(index, 1);
    saveFixtures();
}

function addGroup(group: Group): Group {
    groups.push(group);
    saveGroups();
    return group;
}

function updateGroup(index: number, group: Group): Group {
    groups[index] = group;
    saveGroups();
    return group;
}

function removeGroup(index: number): void {
    groups.splice(index, 1);
    saveGroups();
}

function getDmxStateWithFixtures() {
    return {
        dmxChannels,
        fixtures: fixtures.map(fixture => ({
            ...fixture,
            channelValues: fixture.channels.map((_, index) => dmxChannels[fixture.startAddress + index])
        })),
        groups
    };
}

export function startLaserTime(io: Server) {
    const { inputs } = listMidiInterfaces();
    io.emit('midiInterfaces', inputs);

    initOsc(io);

    io.on('connection', (socket: Socket) => {
        // Send initial DMX state with fixtures and groups
        socket.emit('initialState', getDmxStateWithFixtures());

        socket.on('saveScene', (name: string) => {
            console.log(`Received saveScene request: ${name}`);
            const scene = saveScene(name);
            io.emit('sceneAdded', { name: scene.name, oscAddress: scene.oscAddress });
            console.log(`Emitted sceneAdded event: ${scene.name}`);
        });

        socket.on('loadScene', (name: string) => {
            console.log(`Received loadScene request: ${name}`);
            const scene = loadScene(name);
            if (scene) {
                transitionToScene(io, scene, 1000); // 1 second transition
                io.emit('sceneLoaded', { name: scene.name });
            } else {
                socket.emit('error', { message: `Scene not found: ${name}` });
            }
        });

        socket.on('sendOscTest', ({ address, value }) => {
            if (oscUdpPort) {
                oscUdpPort.send({
                    address: address,
                    args: [
                        {
                            type: "f",
                            value: parseFloat(value)
                        }
                    ]
                });
            }
        });

        socket.on('getOscSettings', () => {
            socket.emit('oscSettings', oscSettings);
        });

        socket.on('getSceneList', () => {
            socket.emit('sceneList', scenes.map(scene => ({ name: scene.name, oscAddress: scene.oscAddress })));
        });

        socket.on('setDmxChannel', ({ channel, value }) => {
            setDmxChannel(channel, value);
            emitDmxUpdate(io, channel, value);
        });

        socket.on('setFixtureChannel', ({ fixtureIndex, channelIndex, value }) => {
            const fixture = fixtures[fixtureIndex];
            if (fixture) {
                const dmxChannel = fixture.startAddress + channelIndex;
                setDmxChannel(dmxChannel, value);
                emitDmxUpdate(io, dmxChannel, value);
            }
        });

        socket.on('setGroupChannel', ({ groupIndex, channelType, value }) => {
            const group = groups[groupIndex];
            if (group) {
                group.fixtureIndices.forEach(fixtureIndex => {
                    const fixture = fixtures[fixtureIndex];
                    const channelIndex = fixture.channels.findIndex(channel => channel.type === channelType);
                    if (channelIndex !== -1) {
                        const dmxChannel = fixture.startAddress + channelIndex;
                        setDmxChannel(dmxChannel, value);
                        emitDmxUpdate(io, dmxChannel, value);
                    }
                });
            }
        });

        socket.on('searchArtnetDevices', async () => {
            try {
                const devices = await searchArtNetDevices();
                socket.emit('artnetDevices', devices);
            } catch (error) {
                console.error('Error searching for ArtNET devices:', error);
                socket.emit('artnetDevices', { error: 'Failed to search for ArtNET devices' });
            }
        });

        socket.on('startMidiLearn', (dmxChannel: number) => {
            midiLearningTarget = dmxChannel;
            socket.emit('midiLearnStarted', dmxChannel);
        });

        socket.on('stopMidiLearn', () => {
            midiLearningTarget = null;
            socket.emit('midiLearnStopped');
        });

        socket.on('setMidiInput', (inputName: string) => {
            if (midiInput) {
                midiInput.close();
            }
            try {
                midiInput = new easymidi.Input(inputName);
                midiInput.on('cc', (msg) => handleMidiMessage({ ...msg, _type: 'cc' }, io));
                socket.emit('midiInputSet', inputName);
            } catch (error) {
                console.error('Error setting MIDI input:', error);
                socket.emit('error', { message: 'Failed to set MIDI input' });
            }
        });

        socket.on('forgetAllMidi', () => {
            midiToDmxMapping = {};
            saveMidiMappings();
            socket.emit('midiMappingsCleared');
        });

        socket.on('addFixture', (fixture: Fixture) => {
            const newFixture = addFixture(fixture);
            io.emit('fixtureAdded', newFixture);
        });

        socket.on('updateFixture', ({ index, fixture }: { index: number; fixture: Fixture }) => {
            const updatedFixture = updateFixture(index, fixture);
            io.emit('fixtureUpdated', { index, fixture: updatedFixture });
        });

        socket.on('removeFixture', (index: number) => {
            removeFixture(index);
            io.emit('fixtureRemoved', index);
        });

        socket.on('addGroup', (group: Group) => {
            const newGroup = addGroup(group);
            io.emit('groupAdded', newGroup);
        });

        socket.on('updateGroup', ({ index, group }: { index: number; group: Group }) => {
            const updatedGroup = updateGroup(index, group);
            io.emit('groupUpdated', { index, group: updatedGroup });
        });

        socket.on('removeGroup', (index: number) => {
            removeGroup(index);
            io.emit('groupRemoved', index);
        });

        socket.on('nukeSettings', () => {
            nukeSettings();
            io.emit('settingsNuked');
            io.emit('initialState', getDmxStateWithFixtures());
        });

        socket.on('saveAllSettings', () => {
            saveAllSettings();
            socket.emit('allSettingsSaved');
        });

        socket.on('loadAllSettings', () => {
            loadAllSettings();
            io.emit('allSettingsLoaded');
            io.emit('initialState', getDmxStateWithFixtures());
        });
    });

    // Emit ArtNET diagnostics periodically
    setInterval(() => {
        const diagnostics = getArtNetDiagnostics();
        io.emit('artnetDiagnostics', diagnostics);
    }, 5000);
}
