// Simple script that just connects to the main app's socket.io server
// and displays MIDI/OSC messages without trying to open any ports directly
const { io } = require("socket.io-client");

// ANSI colors for formatting
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m"
};

// Note names for pretty printing
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteNameFromNumber(noteNumber) {
  if (typeof noteNumber !== 'number') return 'Unknown';
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteName = noteNames[noteNumber % 12];
  return `${noteName}${octave}`;
}

console.log(`${colors.bright}${colors.magenta}==================================================`);
console.log(`  ArtBastard DMX512FTW: MIDI/OSC Monitoring Tool`);
console.log(`  "Watches messages without interfering with ports"`);
console.log(`==================================================${colors.reset}`);
console.log('');

// Connect to the main app's socket.io server
console.log(`${colors.bright}${colors.white}Connecting to ArtBastard server...${colors.reset}`);
const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log(`${colors.green}Connected to ArtBastard server${colors.reset}`);
  console.log(`${colors.dim}This monitor does NOT open any MIDI or OSC ports directly.${colors.reset}`);
  console.log(`${colors.dim}It only shows messages that ArtBastard is already receiving.${colors.reset}`);
  console.log('');
  console.log(`${colors.bright}${colors.white}Monitoring MIDI and OSC messages...${colors.reset}`);
  console.log(`${colors.yellow}Try pressing keys or moving controls on your MIDI device${colors.reset}`);
  console.log('');
});

socket.on("disconnect", () => {
  console.log(`${colors.red}Disconnected from ArtBastard server${colors.reset}`);
});

// Listen for MIDI messages
socket.on("midiMessage", (msg) => {
  if (msg._type === 'noteon') {
    console.log(`${colors.green}MIDI Note On: Channel ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note)}), Velocity ${msg.velocity}${colors.reset}`);
  } 
  else if (msg._type === 'noteoff') {
    console.log(`${colors.gray}MIDI Note Off: Channel ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note)}), Velocity ${msg.velocity}${colors.reset}`);
  }
  else if (msg._type === 'cc') {
    console.log(`${colors.cyan}MIDI CC: Channel ${msg.channel}, Controller ${msg.controller}, Value ${msg.value}${colors.reset}`);
  }
  else if (msg._type === 'program') {
    console.log(`${colors.magenta}MIDI Program Change: Channel ${msg.channel}, Program ${msg.number || 0}${colors.reset}`);
  }
  else if (msg._type === 'pitch') {
    console.log(`${colors.yellow}MIDI Pitch Bend: Channel ${msg.channel}, Value ${msg.value}${colors.reset}`);
  }
  else {
    console.log(`${colors.white}MIDI ${msg._type}: ${JSON.stringify(msg)}${colors.reset}`);
  }
});

// Listen for MIDI learn updates
socket.on("midiMappingLearned", (mapping) => {
  console.log(`${colors.bright}${colors.yellow}MIDI MAPPING LEARNED: DMX Channel ${mapping.channel} mapped to MIDI ${JSON.stringify(mapping.mapping)}${colors.reset}`);
});

// Listen for MIDI interface changes
socket.on("midiInterfaceSelected", (interfaceName) => {
  console.log(`${colors.bright}${colors.blue}MIDI INTERFACE CONNECTED: ${interfaceName}${colors.reset}`);
});

socket.on("midiInterfaceDisconnected", (interfaceName) => {
  console.log(`${colors.bright}${colors.red}MIDI INTERFACE DISCONNECTED: ${interfaceName}${colors.reset}`);
});

// Listen for available MIDI interfaces
socket.on("midiInterfaces", (interfaces) => {
  console.log(`${colors.bright}${colors.white}Available MIDI Interfaces:${colors.reset}`);
  interfaces.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
  console.log('');
});

// Listen for OSC messages (if the app forwards them to the socket)
socket.on("oscMessage", (msg) => {
  console.log(`${colors.blue}OSC Message: Address ${msg.address}, Values: ${JSON.stringify(msg.args)}${colors.reset}`);
});

// Listen for DMX updates
socket.on("dmxUpdate", (update) => {
  console.log(`${colors.dim}DMX Update: Channel ${update.channel} = ${update.value}${colors.reset}`);
});

// Handle common error cases
process.on('SIGINT', () => {
  console.log(`${colors.bright}${colors.white}Shutting down MIDI/OSC monitor...${colors.reset}`);
  socket.disconnect();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`${colors.red}Uncaught exception: ${err.message}${colors.reset}`);
  if (err.message.includes('ECONNREFUSED')) {
    console.error(`${colors.yellow}Make sure ArtBastard is running on port 3001${colors.reset}`);
  }
  process.exit(1);
});