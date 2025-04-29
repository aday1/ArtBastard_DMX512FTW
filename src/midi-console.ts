import { Input as MidiInput } from 'easymidi';

// Define our own MidiMessage interface since it's not exported from easymidi
interface MidiMessage {
    _type?: string;
    channel?: number;
    note?: number;
    velocity?: number;
    controller?: number;
    value?: number;
    number?: number;
}
import easymidi from 'easymidi';
import { UDPPort, OscMessage, OscBundle, OscArgument, TimeTag, MessageInfo } from 'osc';
// Using chalk v4 would be better for CJS compatibility
// For now, we'll use simple ANSI color codes instead

// ANSI Color codes
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        gray: "\x1b[90m",
    },
    
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
    }
};

// Color formatter functions
const colorize = {
    // MIDI message types
    noteon: (text: string) => `${colors.fg.green}${text}${colors.reset}`,
    noteoff: (text: string) => `${colors.fg.gray}${text}${colors.reset}`,
    cc: (text: string) => `${colors.fg.cyan}${text}${colors.reset}`,
    program: (text: string) => `${colors.fg.magenta}${text}${colors.reset}`,
    pitchbend: (text: string) => `${colors.fg.yellow}${text}${colors.reset}`,
    other: (text: string) => text,
    
    // OSC message types
    oscMessage: (text: string) => `${colors.fg.blue}${text}${colors.reset}`,
    oscBundle: (text: string) => `${colors.fg.magenta}${text}${colors.reset}`,
    
    // Status colors
    info: (text: string) => `${colors.bright}${colors.fg.white}${text}${colors.reset}`,
    error: (text: string) => `${colors.bright}${colors.fg.red}${text}${colors.reset}`,
    success: (text: string) => `${colors.bright}${colors.fg.green}${text}${colors.reset}`
};

// Store active MIDI inputs
const midiInputs: { [name: string]: MidiInput } = {};

// Note names for pretty printing
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteNameFromNumber(noteNumber: number): string {
    if (typeof noteNumber !== 'number') return 'Unknown';
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteName = noteNames[noteNumber % 12];
    return `${noteName}${octave}`;
}

// Initialize all MIDI inputs
function initMidi() {
    try {
        const inputs = easymidi.getInputs();
        
        console.log(colorize.info('Available MIDI Inputs:'));
        if (inputs.length === 0) {
            console.log(colorize.error('  No MIDI inputs available'));
            console.log(colorize.info('  Possible reasons:'));
            console.log(colorize.info('  - No MIDI devices are connected to your computer'));
            console.log(colorize.info('  - Your MIDI device is not turned on'));
            console.log(colorize.info('  - You might need to install drivers for your MIDI device'));
            return;
        }
        
        // Print available devices clearly
        console.log(colorize.info(''));
        console.log(colorize.info('MIDI DEVICES DETECTED:'));
        console.log(colorize.info('===================='));
        inputs.forEach((inputName, index) => {
            console.log(colorize.success(`  ${index + 1}. ${inputName}`));
        });
        console.log(colorize.info('===================='));
        console.log('');
        
        // Connect to each input
        inputs.forEach((inputName, index) => {
            try {
                if (midiInputs[inputName]) {
                    // Already connected to this input
                    return;
                }
                
                const input = new easymidi.Input(inputName);
                midiInputs[inputName] = input;
                
                // Set up listeners for various MIDI message types
                input.on('noteon', (msg) => {
                    console.log(colorize.noteon(`[${inputName}] Note On: Channel ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note ?? 0)}), Velocity ${msg.velocity}`));
                });
                
                input.on('noteoff', (msg) => {
                    console.log(colorize.noteoff(`[${inputName}] Note Off: Channel ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note ?? 0)}), Velocity ${msg.velocity}`));
                });
                
                input.on('cc', (msg) => {
                    console.log(colorize.cc(`[${inputName}] Control Change: Channel ${msg.channel}, Controller ${msg.controller}, Value ${msg.value}`));
                });
                
                input.on('program', (msg) => {
                    console.log(colorize.program(`[${inputName}] Program Change: Channel ${msg.channel}, Number ${msg.number ?? 0}`));
                });
                
                input.on('pitch', (msg) => {
                    console.log(colorize.pitchbend(`[${inputName}] Pitch Bend: Channel ${msg.channel}, Value ${msg.value}`));
                });
                
                // Generic handler for other MIDI message types
                ['aftertouch', 'poly aftertouch', 'position', 'select', 'sysex', 'mtc', 'quarter frame', 'songposition', 'songselect', 'clock', 'start', 'continue', 'stop', 'reset'].forEach(type => {
                    input.on(type, (msg) => {
                        console.log(colorize.other(`[${inputName}] ${type}: ${JSON.stringify(msg)}`));
                    });
                });
                
                console.log(colorize.info(`Connected to MIDI input: ${inputName}`));
            } catch (error) {
                console.log(colorize.error(`Error connecting to MIDI input ${inputName}: ${error}`));
            }
        });
    } catch (error) {
        console.log(colorize.error(`Error initializing MIDI: ${error}`));
        console.log(colorize.info('This might be because:'));
        console.log(colorize.info('- MIDI system is not accessible'));
        console.log(colorize.info('- You may need administrator privileges or proper permissions'));
    }
}

// Initialize OSC listening
function initOsc(port: number = 8000) {
    try {
        const udpPort = new UDPPort({
            localAddress: "0.0.0.0",
            localPort: port,
            metadata: true
        });
        
        udpPort.on("ready", () => {
            console.log(colorize.info(`OSC listening on port ${port}`));
        });
        
        udpPort.on("message", (oscMsg: OscMessage, timeTag: TimeTag, info: MessageInfo) => {
            const { address, args } = oscMsg;
            console.log(colorize.oscMessage(`[OSC] Address: ${address}, From: ${info.address}:${info.port}`));
            if (args && args.length > 0) {
                args.forEach((arg: OscArgument, index: number) => {
                    console.log(colorize.oscMessage(`  Arg ${index}: ${arg.type} = ${arg.value}`));
                });
            }
        });
        
        udpPort.on("bundle", (bundle: OscBundle, timeTag: TimeTag, info: MessageInfo) => {
            console.log(colorize.oscBundle(`[OSC] Bundle from: ${info.address}:${info.port}, Time: ${timeTag.raw[0]}.${timeTag.raw[1]}`));
            if (bundle.packets) {
                console.log(colorize.oscBundle(`  Contains ${bundle.packets.length} packets`));
            }
        });
        
        udpPort.on("error", (error) => {
            console.log(colorize.error(`[OSC] Error: ${error.message}`));
        });
        
        // Open the socket
        udpPort.open();
        
        return udpPort;
    } catch (error) {
        console.log(colorize.error(`Error initializing OSC: ${error}`));
        return null;
    }
}

// Main function
function main() {
    console.log(colorize.info('=================================================='));
    console.log(colorize.info('  ArtBastard DMX512FTW: Console MIDI/OSC Monitor'));
    console.log(colorize.info('  "See your MIDI devices and signals in real-time"'));
    console.log(colorize.info('=================================================='));
    console.log('');
    
    // Print system information
    console.log(colorize.info('System Information:'));
    console.log(colorize.info(`- Node.js: ${process.version}`));
    console.log(colorize.info(`- Platform: ${process.platform}`));
    console.log(colorize.info(`- easymidi version: ${require('easymidi/package.json').version}`));
    console.log('');
    
    // Initialize MIDI
    console.log(colorize.info('Initializing MIDI system...'));
    initMidi();
    
    // Initialize OSC
    console.log(colorize.info('Initializing OSC system...'));
    const oscPort = initOsc();
    
    // Check if we have any interfaces to monitor
    if (Object.keys(midiInputs).length === 0 && !oscPort) {
        console.log('');
        console.log(colorize.error('============================================='));
        console.log(colorize.error('  No MIDI or OSC interfaces available to monitor'));
        console.log(colorize.error('============================================='));
        console.log('');
        console.log(colorize.info('Troubleshooting tips:'));
        console.log(colorize.info('1. Make sure your MIDI device is connected and powered on'));
        console.log(colorize.info('2. Check if your MIDI device needs drivers installed'));
        console.log(colorize.info('3. Try running this program with administrator privileges'));
        console.log(colorize.info('4. On Windows, check Device Manager for any issues with your USB/MIDI devices'));
        console.log('');
        console.log(colorize.info('Press Ctrl+C to exit, or leave this window open to detect devices when connected'));
    } else {
        console.log('');
        console.log(colorize.success('Monitoring started - Press Ctrl+C to exit'));
        console.log('');
        console.log(colorize.info('Waiting for MIDI events... Try pressing keys on your MIDI controller'));
        console.log('');
    }
    
    // Setup periodic MIDI device refresh
    setInterval(() => {
        try {
            const currentInputs = easymidi.getInputs();
            const newInputs = currentInputs.filter(input => !midiInputs[input]);
            
            // Check for new devices
            if (newInputs.length > 0) {
                console.log('');
                console.log(colorize.success('============================='));
                console.log(colorize.success('  New MIDI devices detected:'));
                console.log(colorize.success('============================='));
                newInputs.forEach(inputName => {
                    console.log(colorize.success(`  - ${inputName}`));
                    try {
                        const input = new easymidi.Input(inputName);
                        midiInputs[inputName] = input;
                        
                        // Set up listeners for various MIDI message types
                        input.on('noteon', (msg) => {
                            console.log(colorize.noteon(`[${inputName}] Note On: Channel ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note ?? 0)}), Velocity ${msg.velocity}`));
                        });
                        
                        input.on('noteoff', (msg) => {
                            console.log(colorize.noteoff(`[${inputName}] Note Off: Channel ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note ?? 0)}), Velocity ${msg.velocity}`));
                        });
                        
                        input.on('cc', (msg) => {
                            console.log(colorize.cc(`[${inputName}] Control Change: Channel ${msg.channel}, Controller ${msg.controller}, Value ${msg.value}`));
                        });
                        
                        input.on('program', (msg) => {
                            console.log(colorize.program(`[${inputName}] Program Change: Channel ${msg.channel}, Number ${msg.number ?? 0}`));
                        });
                        
                        input.on('pitch', (msg) => {
                            console.log(colorize.pitchbend(`[${inputName}] Pitch Bend: Channel ${msg.channel}, Value ${msg.value}`));
                        });
                        
                        // Generic handler for other MIDI message types
                        ['aftertouch', 'poly aftertouch', 'position', 'select', 'sysex', 'mtc', 'quarter frame', 'songposition', 'songselect', 'clock', 'start', 'continue', 'stop', 'reset'].forEach(type => {
                            input.on(type, (msg) => {
                                console.log(colorize.other(`[${inputName}] ${type}: ${JSON.stringify(msg)}`));
                            });
                        });
                        
                        console.log(colorize.success(`Connected to MIDI input: ${inputName}`));
                        console.log(colorize.info('Try pressing keys or turning knobs on this device to see MIDI messages'));
                    } catch (error) {
                        console.log(colorize.error(`Error connecting to MIDI input ${inputName}: ${error}`));
                    }
                });
                console.log('');
            }
            
            // Check for removed devices
            const removedInputs = Object.keys(midiInputs).filter(
                input => !currentInputs.includes(input)
            );
            
            if (removedInputs.length > 0) {
                console.log(colorize.info('MIDI devices disconnected:'));
                removedInputs.forEach(inputName => {
                    console.log(`  - ${inputName}`);
                    if (midiInputs[inputName]) {
                        midiInputs[inputName].close();
                        delete midiInputs[inputName];
                    }
                });
                console.log('');
            }
            
            // If no devices remain, show a reminder
            if (Object.keys(midiInputs).length === 0 && currentInputs.length === 0) {
                // Only show this message every 30 seconds to avoid spam
                if (Date.now() % 30000 < 5000) {
                    console.log(colorize.info('No MIDI devices currently connected. Waiting for devices...'));
                }
            }
        } catch (error) {
            console.log(colorize.error(`Error during device refresh: ${error}`));
        }
    }, 5000); // Check every 5 seconds
}

// Start the application
main();