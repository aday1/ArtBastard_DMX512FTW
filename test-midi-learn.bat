@echo off
echo === MIDI Learn Test Script ===
echo This script will help test if MIDI Learn is working properly.
echo.
echo 1. Make sure your MIDI controller is connected
echo 2. When the script starts, you'll see available MIDI inputs
echo 3. Type "learn 1" to start MIDI Learn for DMX channel 1
echo 4. Move a knob or slider on your MIDI controller
echo 5. The script will report if it successfully detected the MIDI input
echo.
echo Press any key to continue...
pause > nul

node midilearn-test.js