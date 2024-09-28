# ArtBastard Web Interface

ArtBastard512DMXFTW Web Interface is a web-based application for controlling DMX lighting fixtures, managing scenes, and creating fixture groups. It supports MIDI mapping, OSC communication, and ArtNET protocol for DMX over Ethernet.

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

- Raspberry Pi (or any Linux-based system)
- Git (for cloning the repository)
- Internet connection (for downloading packages and dependencies)

## Installation on my Pi Zero (works on my machine etc)

1. Update your Raspberry Pi:
   ```
   sudo apt-get update
   sudo apt-get upgrade
   ```

2. Install Git if not already installed:
   ```
   sudo apt-get install git
   ```

3. Clone this repository:
   ```
   git clone https://github.com/aday1/ArtBastard_DMX512FTW
   cd ArtBastard_DMX512FTW
   ```

4. Make the install script executable:
   ```
   chmod +x install.sh
   ```

5. Run the install script:
   ```
   ./install.sh
   ```

   This script will:
   - Update package lists
   - Install Node.js and npm
   - Install build essentials
   - Install additional dependencies for DMX
   - Install project dependencies
   - Create necessary directories
   - Build the application

6. After installation, start the application:
   ```
   npm start
   ```

7. Open a web browser and navigate to `http://<YOUR_RASPBERRY_PI>:3001` (or localhost if your doing this locally ...).

## Manual Setup (for other systems)

If you prefer to set up the application manually or are using a different system:

1. Ensure you have Node.js (v14 or later) and npm installed.

2. Install dependencies:
   ```
   npm install
   ```

3. Create the data directory:
   ```
   mkdir -p data
   ```

4. Build the application:
   ```
   npm run build
   ```

5. Start the application:
   ```
   npm start
   ```

## Usage

1. After starting the application, open a web browser and navigate to `http://localhost:3001` (or the IP address of your Raspberry Pi if accessing from another device).
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
- **MIDI Message Viewing**: In the MIDI/OSC Setup page, you can view incoming MIDI messages in real-time.
- **NUKE SETTINGS**: Use the "NUKE SETTINGS" button to reset all settings to their default values.
- **Save/Load All Settings**: Use the "Save All Settings" and "Load All Settings" buttons to manage your entire configuration.

## Configuration

- The default ArtNET settings can be modified in the `src/index.ts` file.
- OSC settings can be adjusted in the same file.

## Troubleshooting

- If you encounter any permission issues during installation, try running the commands with `sudo`.
- Ensure your Raspberry Pi is connected to the internet during installation.
- If you face issues with Node.js versions, consider using a version manager like `nvm` to install and use the correct version.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any problems or have any questions, please open an issue in the GitHub repository.

## Acknowledgements

Special thanks to the AI assistant that helped in developing and documenting this project.
No really, Claude's a sic bot and I for one welcome our new art bot bastards.