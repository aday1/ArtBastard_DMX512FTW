const easymidi = require('easymidi');

// Simple ANSI colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  red: "\x1b[31m",
};

console.log('============================================');
console.log('  Simple MIDI Monitor - No Blocking/Locking');
console.log('============================================');
console.log('');

// List available inputs
const inputs = easymidi.getInputs();
console.log('Available MIDI devices:');
if (inputs.length === 0) {
  console.log('  No MIDI devices found');
} else {
  inputs.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
}
console.log('');

// Note names for pretty printing
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteNameFromNumber(noteNumber) {
  if (typeof noteNumber !== 'number') return 'Unknown';
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteName = noteNames[noteNumber % 12];
  return `${noteName}${octave}`;
}

// Instead of trying to open all devices, we'll try them one by one
// and only connect to the ones that work
inputs.forEach(inputName => {
  try {
    // Try to create a new input in a non-blocking way
    const input = new easymidi.Input(inputName, true); // true = non-blocking
    console.log(`${colors.green}Successfully connected to: ${inputName}${colors.reset}`);

    // Listen for MIDI events
    input.on('noteon', msg => {
      console.log(`${colors.green}[${inputName}] Note On: Ch ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note)}), Vel ${msg.velocity}${colors.reset}`);
    });

    input.on('noteoff', msg => {
      console.log(`${colors.gray}[${inputName}] Note Off: Ch ${msg.channel}, Note ${msg.note} (${getNoteNameFromNumber(msg.note)}), Vel ${msg.velocity}${colors.reset}`);
    });

    input.on('cc', msg => {
      console.log(`${colors.cyan}[${inputName}] CC: Ch ${msg.channel}, Controller ${msg.controller}, Value ${msg.value}${colors.reset}`);
    });

    input.on('program', msg => {
      console.log(`${colors.yellow}[${inputName}] Program Change: Ch ${msg.channel}, Program ${msg.number || 0}${colors.reset}`);
    });

    input.on('pitch', msg => {
      console.log(`${colors.yellow}[${inputName}] Pitch Bend: Ch ${msg.channel}, Value ${msg.value}${colors.reset}`);
    });

    // Handle other MIDI message types
    ['aftertouch', 'poly aftertouch', 'sysex'].forEach(type => {
      input.on(type, msg => {
        console.log(`${colors.white}[${inputName}] ${type}: ${JSON.stringify(msg)}${colors.reset}`);
      });
    });
  } catch (error) {
    console.log(`${colors.red}Could not connect to ${inputName}: ${error.message}${colors.reset}`);
  }
});

console.log('');
console.log('MIDI monitor running - Press Ctrl+C to exit');
console.log('Try playing your MIDI device to see messages');
console.log('');

// To keep the app running
process.stdin.resume();

// Handle Ctrl+C to close MIDI ports properly
process.on('SIGINT', () => {
  console.log('Closing MIDI ports and exiting...');
  process.exit();
});