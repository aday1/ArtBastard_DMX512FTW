# ArtBastard DMX512FTW - React Edition

An artistic DMX512 controller with WebGL visualization, 3D fixture placement, and enhanced MIDI integration.

## 🎨 Features

### Original Features
- Control DMX fixtures using ArtNet protocol
- Map MIDI controllers to DMX channels
- Visualize MIDI data in multiple formats
- Multiple simultaneous MIDI device support
- OSC control and monitoring
- Scene management
- Integrated MIDI monitoring

### New Features in React Edition
- **GPU-accelerated DMX visualization** using WebGL
- **Interactive 3D fixture placement** with Three.js
- **Improved MIDI Learn** with visual feedback and reliability
- **Responsive design** for various devices
- **Multiple UI themes** (Art Critic, Standard, Minimal)

## 📋 Quick Start

### React Edition
1. Run `./build-react.sh` to build the React edition
2. Start the application with `npm start`
3. Access the React interface at http://localhost:3001

### Original Version
1. Run `Launch-ArtBastard-Master.bat` to open the Master Console
2. Follow the Quick Start guide in the console
3. The original application will be accessible at http://localhost:3001/public

## 🚀 Installation

### Windows
1. Run `Launch-ArtBastard-Master.bat` to open the Master Console
2. Click "Check Environment" to verify your system
3. Click "Complete Installation" to install dependencies and build the app
4. Run `./build-react.sh` to build the React edition
5. Click "Start Server" to launch the application

### Linux/macOS
1. Run `./setup.sh` to install dependencies and build the application
2. Run `./build-react.sh` to build the React edition
3. Start the application with `npm start`

## 🧰 Usage

### DMX Control
The main interface provides direct control of 512 DMX channels with GPU-accelerated visualization. Channels can be organized into fixtures and groups for easier management.

### MIDI Integration
Connect MIDI controllers to control DMX channels and scenes:

1. Go to the "MIDI/OSC Atelier" section
2. Connect your MIDI device
3. Return to the DMX control panel and click on a channel's "MIDI Learn" button
4. Move a fader or press a button on your MIDI controller
5. The channel will now respond to that MIDI control

### 3D Fixture Visualization
Place and visualize your fixtures in 3D space:

1. Go to the "Fixture Composition" section
2. Define your fixtures with their channel assignments
3. Use the 3D visualization to arrange fixtures and see their output

### Scenes
Create and recall lighting scenes:

1. Set up your DMX channels as desired
2. In the main interface, enter a name for your scene
3. Click "Save Scene"
4. To recall the scene, select it from the list and click "Load"

### Themes
ArtBastard offers three distinct UI themes:

- **Art Critic**: Verbose, pretentious language and artistic flourishes
- **Standard**: Professional, direct interface with technical terminology
- **Minimal**: Essential minimum interface with clean design

## 🔧 Configuration

### ArtNet Configuration
Configure your ArtNet settings in the "Settings" section:

- IP Address: The IP of your ArtNet device
- Subnet: ArtNet subnet (usually 0)
- Universe: ArtNet universe
- Net: ArtNet net (usually 0)
- Port: ArtNet port (usually 6454)
- Refresh Interval: How often DMX data is sent (in ms)

### Data Files
All configuration is stored in the `data/` directory:

- `config.json`: ArtNet and general settings
- `scenes.json`: Saved lighting scenes
- `all_settings.json`: Created when exporting all settings

## 🛠️ Development

### Project Structure
- `src/`: Backend source code
- `react-app/`: React frontend application
- `data/`: Configuration and scene files
- `logs/`: Application logs

### Building for Development
For backend development:
```bash
npm run start:dev
```

For frontend development:
```bash
cd react-app
npm run start
```

## ⚠️ Troubleshooting

If you encounter issues:

1. Check the Console Output tab in the Master Console
2. Look for error messages in the application logs (View Log Files button)
3. Use the MIDI Monitor tab to verify MIDI signals
4. Check the debug console in your browser

### MIDI Issues
- Ensure your MIDI device is connected before starting the application
- Check that you have the appropriate drivers installed
- Some browsers may require MIDI permission to be granted

### ArtNet Issues
- Verify your ArtNet device is powered on and connected to the network
- Check IP address configuration
- Try pinging the device from the Settings panel

### Performance Issues
- If visualizations are sluggish, try lowering the graphics quality in Settings
- Disable 3D visualization for better performance on slower devices
- Reduce the number of displayed DMX channels

## 📜 License

MIT