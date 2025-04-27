// PowerShell MIDI/OSC Monitor that connects to the main app via Socket.IO
// This script is designed to be called from PowerShell

const { io } = require("socket.io-client");

// Simpler color codes for PowerShell compatibility
const fgGreen = "\x1b[92m";
const fgCyan = "\x1b[96m";
const fgYellow = "\x1b[93m";
const fgMagenta = "\x1b[95m";
const fgRed = "\x1b[91m";
const fgGray = "\x1b[90m";
const fgWhite = "\x1b[97m";
const reset = "\x1b[0m";
const bright = "\x1b[1m";

// Note conversion helper
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function getNoteNameFromNumber(noteNumber) {
  if (typeof noteNumber !== 'number') return 'Unknown';
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteName = noteNames[noteNumber % 12];
  return `${noteName}${octave}`;
}

console.log(`${bright}${fgMagenta}==================================================`);
console.log(`  ArtBastard DMX512FTW: PowerShell MIDI/OSC Monitor`);
console.log(`  "Monitors messages via Socket.IO connection"`);
console.log(`==================================================${reset}`);
console.log('');
console.log('This monitor connects to the main application server.');
console.log('It does NOT directly access any MIDI or OSC ports.');

// Connection status variables
let midiDevicesDiscovered = [];
let connectedToServer = false;
let lastMidiActivity = 0;
let lastOscActivity = 0;

// Create socket connection to the main server
console.log(`${fgWhite}Connecting to ArtBastard server on localhost:3001...${reset}`);
const socket = io("http://localhost:3001");

// Handle connection events
socket.on("connect", () => {
  console.log(`${fgGreen}Connected to ArtBastard DMX512FTW server${reset}`);
  connectedToServer = true;
  
  // Start status updates
  setInterval(updateStatus, 1000);
});

socket.on("disconnect", () => {
  console.log(`${fgRed}Disconnected from ArtBastard server${reset}`);
  connectedToServer = false;
});

// Handle MIDI device information
socket.on("midiInterfaces", (interfaces) => {
  midiDevicesDiscovered = interfaces;
  console.log(`${fgCyan}Available MIDI Interfaces:${reset}`);
  if (interfaces && interfaces.length > 0) {
    interfaces.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
  } else {
    console.log(`  ${fgGray}No MIDI interfaces detected${reset}`);
  }
  console.log('');
});

socket.on("midiInputsActive", (activeInputs) => {
  console.log(`${fgCyan}Connected MIDI Inputs:${reset}`);
  if (activeInputs && activeInputs.length > 0) {
    activeInputs.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
    });
  } else {
    console.log(`  ${fgGray}No active MIDI connections${reset}`);
  }
  console.log('');
});

socket.on("midiInterfaceSelected", (interfaceName) => {
  console.log(`${fgGreen}MIDI Interface Connected: ${interfaceName}${reset}`);
});

socket.on("midiInterfaceDisconnected", (interfaceName) => {
  console.log(`${fgRed}MIDI Interface Disconnected: ${interfaceName}${reset}`);
});

// Handle MIDI messages
socket.on("midiMessage", (msg) => {
  lastMidiActivity = Date.now();
  
  const source = msg.source ? `[${msg.source}]` : '';
  
  switch(msg._type) {
    case 'noteon':
      console.log(`${fgGreen}${source} Note On: Ch ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note)}), Vel ${msg.velocity}${reset}`);
      break;
    case 'noteoff':
      console.log(`${fgGray}${source} Note Off: Ch ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note)}), Vel ${msg.velocity}${reset}`);
      break;
    case 'cc':
      console.log(`${fgCyan}${source} CC: Ch ${msg.channel}, Ctrl ${msg.controller}, Value ${msg.value}${reset}`);
      break;
    case 'program':
      console.log(`${fgMagenta}${source} Program: Ch ${msg.channel}, Program ${msg.number || 0}${reset}`);
      break;
    case 'pitch':
      console.log(`${fgYellow}${source} Pitch Bend: Ch ${msg.channel}, Value ${msg.value}${reset}`);
      break;
    default:
      console.log(`${fgWhite}${source} ${msg._type}: ${JSON.stringify(msg)}${reset}`);
  }
});

// Handle OSC messages (if the app forwards them)
socket.on("oscMessage", (msg) => {
  lastOscActivity = Date.now();
  console.log(`${fgCyan}OSC Message: ${msg.address} - Values: ${JSON.stringify(msg.args)}${reset}`);
});

// Handle DMX updates
socket.on("dmxUpdate", (update) => {
  console.log(`${fgGray}DMX Update: Channel ${update.channel} = ${update.value}${reset}`);
});

// Handle MIDI learn status
socket.on("midiMappingLearned", (mapping) => {
  console.log(`${bright}${fgYellow}MIDI Mapping Created: DMX Channel ${mapping.channel} mapped to MIDI ${JSON.stringify(mapping.mapping)}${reset}`);
});

socket.on("midiLearnStarted", ({ channel }) => {
  console.log(`${bright}${fgMagenta}MIDI Learn Started for DMX Channel ${channel}${reset}`);
});

socket.on("midiLearnTimeout", ({ channel }) => {
  console.log(`${fgRed}MIDI Learn Timeout for DMX Channel ${channel}${reset}`);
});

// Status update function
function updateStatus() {
  if (!connectedToServer) return;
  
  // Update activity indicators
  const now = Date.now();
  const midiActive = now - lastMidiActivity < 1000;
  const oscActive = now - lastOscActivity < 1000;
  
  // Only emit status if activity has changed
  if (midiActive) {
    process.stdout.write(`${bright}${fgGreen}● MIDI${reset} `);
  }
  
  if (oscActive) {
    process.stdout.write(`${bright}${fgCyan}● OSC${reset} `);
  }
  
  if (midiActive || oscActive) {
    process.stdout.write("\r");
  }
}

// Handle process exit
process.on('SIGINT', () => {
  console.log(`\n${fgWhite}Shutting down MIDI/OSC monitor...${reset}`);
  socket.disconnect();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`${fgRed}Error: ${err.message}${reset}`);
  if (err.message.includes('ECONNREFUSED')) {
    console.error(`${fgYellow}Make sure ArtBastard server is running on port 3001${reset}`);
  }
  process.exit(1);
});