*I'd like to thank Claude.dev tbh, but yeah this is completely not finished but ill keep my main working releases here*


# LaserTime Web Interface

LaserTime Web Interface is a web-based application for controlling DMX lighting fixtures, managing scenes, and creating fixture groups. It supports MIDI mapping, OSC communication, and ArtNET protocol for DMX over Ethernet.

## Features

- DMX channel control with horizontal sliders
- Fixture management and grouping
- Scene creation, playback, and OSC addressing
- MIDI mapping and real-time MIDI message viewing
- OSC communication and debugging
- ArtNET support
- Real-time updates via WebSocket
- Settings management (save, load, and reset all settings)

## Prerequisites

- Node.js (v14 or later)
- npm (usually comes with Node.js)

## Installation

1. Clone this repository or download the source code.
2. Navigate to the project directory in your terminal.
3. Run the `setup.bat` file (on Windows) or `setup.sh` file (on macOS/Linux) to install dependencies and start the application.

   For Windows:
   ```
   setup.bat
   ```

   For macOS/Linux:
   ```
   ./setup.sh
   ```

   This script will install the necessary dependencies and start the application.

## Manual Setup

If you prefer to set up the application manually:

1. Install dependencies:
   ```
   npm install
   ```

2. Start the application:
   ```
   npm start
   ```

## Usage

1. Open a web browser and navigate to `http://localhost:3001` (or the port specified in your configuration).
2. Use the interface to control DMX channels, manage fixtures, create groups, and save/load scenes.
3. Set up MIDI mappings, OSC communication, and ArtNET devices as needed.

### Main Features

- **DMX Control**: Use the horizontal sliders to adjust DMX channel values.
- **Fixtures**: Create and manage lighting fixtures with multiple channels.
- **Groups**: Group fixtures together for easier control.
- **Scenes**: Save and load lighting scenes, each with its own OSC address.
- **MIDI Mapping**: Map MIDI controls to DMX channels for external control.
- **OSC Debug**: View incoming OSC messages for debugging.
- **ArtNET**: Search for and connect to ArtNET devices on the network.

### New Features

- **MIDI Message Viewing**: In the MIDI/OSC Setup page, you can now view incoming MIDI messages in real-time.
- **NUKE SETTINGS**: Use the "NUKE SETTINGS" button to reset all settings to their default values.
- **Save/Load All Settings**: Use the "Save All Settings" and "Load All Settings" buttons to manage your entire configuration.

## Configuration

- The default ArtNET settings can be modified in the `src/index.ts` file.
- OSC settings can be adjusted in the same file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any problems or have any questions, please open an issue in the GitHub repository.
