// Simple Node.js script to run the MIDI monitor
// This avoids any issues with running the ts-node command directly

console.log("========================================================================");
console.log("  ArtBastard DMX512FTW: MIDI/OSC Monitor");
console.log("  \"The silent conversational partner for your devices\"");
console.log("========================================================================");
console.log("");
console.log("Launching MIDI/OSC Monitor...");
console.log("");

// Use the built version if available, otherwise use ts-node
try {
  if (require('fs').existsSync('./build/midi-console.js')) {
    console.log("Using compiled version...");
    require('./build/midi-console.js');
  } else {
    console.log("Using ts-node for direct execution...");
    require('ts-node').register();
    require('./src/midi-console.ts');
  }
} catch (error) {
  console.error("Error running MIDI monitor:", error);
  console.log("\nPress Ctrl+C to exit");
}