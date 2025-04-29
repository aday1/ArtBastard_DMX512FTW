# Migration Guide: ArtBastard DMX512FTW to React Edition

This guide outlines the steps to migrate from the original ArtBastard DMX512FTW to the new React-based version with enhanced WebGL and MIDI functionality.

## Overview

The migration involves:
1. Setting up the new React frontend
2. Adapting the existing Node.js backend to serve the React app
3. Migrating your existing configuration and scenes
4. Testing the new functionality

## Step 1: Install Dependencies

```bash
# Navigate to the react-app directory
cd ArtBastard_DMX512FTW/react-app

# Install dependencies
npm install

# Or if you prefer yarn
yarn install
```

## Step 2: Build the React App

```bash
# Build the React app
npm run build

# Or with yarn
yarn build
```

This creates a production build in the `dist` folder.

## Step 3: Update Backend to Serve React App

Edit the server.ts file to serve the React app:

```typescript
// Add this to server.ts
app.use(express.static(path.join(__dirname, '../react-app/dist')));

// Make sure all routes not handled by the API are directed to the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../react-app/dist/index.html'));
});
```

## Step 4: Migrate Configuration Files

Your existing configuration files are compatible with the new version. The React app will load:
- `data/config.json` - Contains ArtNet and MIDI mappings
- `data/scenes.json` - Contains your saved scenes

No manual migration is needed as the data format remains the same.

## Step 5: Start the Server

```bash
# From the project root
npm run build
npm start
```

Visit http://localhost:3001 to see the new interface.

## Troubleshooting

### MIDI Devices Not Detected

If MIDI devices aren't being detected:
1. Check browser MIDI compatibility (Chrome works best)
2. Ensure the MIDI device is connected before starting the application
3. Check the browser console for any errors

### Performance Issues

If you experience performance issues with the WebGL visualizations:
1. Try disabling 3D fixture visualization in the settings
2. Reduce the number of visible DMX channels
3. Use a browser with better WebGL support (Chrome or Firefox)

### Configuration Migration Issues

If your configurations don't appear to load:
1. Check the console for any errors
2. Verify your config files are in the correct location
3. Try restarting the server

## New Features Guide

### MIDI Learn

The new MIDI Learn implementation provides:
- Visual feedback during learning mode
- Clear status indicators
- More reliable mapping

To use MIDI Learn:
1. Click the "MIDI Learn" button on any DMX channel
2. Move a control on your MIDI device
3. The channel will automatically map to that control

### 3D Fixture Visualization

The new 3D visualization allows you to:
- See your fixtures in a 3D space
- Visualize light beams and colors
- Drag and position fixtures in the virtual environment

To use:
1. Navigate to the "Fixture Composition" tab
2. Add fixtures with their DMX addresses and channel configurations
3. The 3D view will automatically show your fixtures

### WebGL DMX Visualization

The GPU-accelerated DMX visualization provides:
- Real-time visualization of all 512 DMX channels
- Color-coded intensity display
- Interactive selection

## Feedback and Support

If you encounter issues during migration or have suggestions for improvements, please open an issue on the GitHub repository.