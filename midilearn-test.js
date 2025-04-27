// Simple test script to verify MIDI learn functionality
const easymidi = require('easymidi');
const fs = require('fs');
const path = require('path');

// Config file path
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

// Globals
let midiMappings = {};
let currentMidiLearnChannel = null;
let activeInputs = {};

// Load existing config
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const config = JSON.parse(data);
            if (config.midiMappings) {
                midiMappings = config.midiMappings;
                console.log('Loaded MIDI mappings:', midiMappings);
            }
        } catch (err) {
            console.error('Error loading config:', err);
        }
    } else {
        console.log('No config file found at:', CONFIG_FILE);
    }
}

// Save config
function saveConfig() {
    const configToSave = {
        artNetConfig: {}, // Keeping it empty for this test
        midiMappings
    };
    
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
        console.log('Saved MIDI mappings to config file');
    } catch (err) {
        console.error('Error saving config:', err);
    }
}

// Connect to a MIDI input
function connectMidiInput(inputName) {
    if (activeInputs[inputName]) {
        console.log(`Already connected to ${inputName}`);
        return;
    }

    try {
        console.log(`Connecting to MIDI input: ${inputName}`);
        const input = new easymidi.Input(inputName);
        
        // Set up event handlers
        input.on('noteon', (msg) => {
            console.log('Received note on:', msg);
            handleMidiMessage('noteon', { ...msg, source: inputName });
        });
        
        input.on('cc', (msg) => {
            console.log('Received CC:', msg);
            handleMidiMessage('cc', { ...msg, source: inputName });
        });
        
        activeInputs[inputName] = input;
        console.log(`Successfully connected to ${inputName}`);
    } catch (err) {
        console.error(`Error connecting to ${inputName}:`, err);
    }
}

// Handle MIDI messages
function handleMidiMessage(type, msg) {
    // Check if we're in MIDI learn mode
    if (currentMidiLearnChannel !== null) {
        console.log(`MIDI learn active for channel ${currentMidiLearnChannel}`);
        
        let mapping;
        if (type === 'noteon') {
            mapping = {
                channel: msg.channel,
                note: msg.note
            };
        } else if (type === 'cc') {
            mapping = {
                channel: msg.channel,
                controller: msg.controller
            };
        }
        
        if (mapping) {
            console.log(`Learning mapping for channel ${currentMidiLearnChannel}:`, mapping);
            midiMappings[currentMidiLearnChannel] = mapping;
            saveConfig();
            console.log(`Successfully learned MIDI mapping for channel ${currentMidiLearnChannel}`);
            
            // Exit learn mode
            currentMidiLearnChannel = null;
        }
    } else {
        // Regular MIDI handling - check if we have mappings for this controller
        if (type === 'cc') {
            const controlKey = `${msg.channel}:${msg.controller}`;
            console.log(`Checking for mappings for ${controlKey}`);
            
            for (const [dmxChannel, mapping] of Object.entries(midiMappings)) {
                if (mapping.controller !== undefined) {
                    const mappingKey = `${mapping.channel}:${mapping.controller}`;
                    if (mappingKey === controlKey) {
                        const channelIdx = parseInt(dmxChannel);
                        const dmxValue = Math.floor((msg.value / 127) * 255);
                        console.log(`Mapping found! Setting DMX channel ${channelIdx} to ${dmxValue}`);
                    }
                }
            }
        }
    }
}

// Start MIDI learn for a channel
function startMidiLearn(channel) {
    currentMidiLearnChannel = channel;
    console.log(`MIDI learn mode ACTIVE for channel ${channel}`);
    console.log('Move any knob or fader on your MIDI controller to assign it');
}

// List MIDI inputs
function listInputs() {
    const inputs = easymidi.getInputs();
    console.log('Available MIDI inputs:');
    inputs.forEach((input, i) => {
        console.log(`${i+1}. ${input}`);
    });
    return inputs;
}

// Main program
function main() {
    console.log('=== MIDI Learn Test Script ===');
    loadConfig();
    
    const inputs = listInputs();
    if (inputs.length === 0) {
        console.log('No MIDI inputs available. Please connect a MIDI device and try again.');
        return;
    }
    
    // Connect to the first input by default
    if (inputs.length > 0) {
        connectMidiInput(inputs[0]);
    }
    
    // Simple CLI for testing
    process.stdout.write('\nCommands:\n');
    process.stdout.write('  learn <channel> - Start MIDI learn for a DMX channel\n');
    process.stdout.write('  list - List MIDI mappings\n');
    process.stdout.write('  exit - Exit the program\n\n');
    
    process.stdin.on('data', (data) => {
        const input = data.toString().trim();
        const args = input.split(' ');
        
        if (args[0] === 'learn' && args[1]) {
            const channel = parseInt(args[1]);
            startMidiLearn(channel);
        } else if (args[0] === 'list') {
            console.log('Current MIDI mappings:');
            console.log(midiMappings);
        } else if (args[0] === 'exit') {
            console.log('Exiting...');
            for (const input of Object.values(activeInputs)) {
                input.close();
            }
            process.exit(0);
        } else {
            console.log('Unknown command. Available commands: learn <channel>, list, exit');
        }
    });
}

// Start the program
main();