# ArtBastard DMX512FTW React Edition

A modern rewrite of the ArtBastard DMX512FTW lighting controller featuring:

- React-based frontend with TypeScript
- GPU-accelerated DMX channel visualizations via WebGL
- Interactive 3D fixture placement using Three.js
- Responsive visual feedback for MIDI control
- Improved MIDI Learn functionality

## Features

### Core Features
- DMX-512 control over ArtNet
- MIDI controller integration with reliable MIDI Learn
- Scene saving and recall
- Real-time visualization of DMX values
- 3D visualization of fixtures and lighting

### Technical Features
- WebGL-powered DMX channel visualization
- Three.js 3D fixture visualization
- Responsive design
- Improved performance with GPU acceleration
- Enhanced MIDI learn functionality

## Getting Started

### Prerequisites
- Node.js 16 or higher
- Yarn or npm

### Installation

1. Clone the repository
2. Navigate to the react-app directory:
   ```
   cd ArtBastard_DMX512FTW/react-app
   ```
3. Install dependencies:
   ```
   yarn install
   ```
   or
   ```
   npm install
   ```

### Running the Application

1. Start the development server:
   ```
   yarn start
   ```
   or
   ```
   npm start
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

To create a production build:
```
yarn build
```
or
```
npm run build
```

The build output will be in the `dist` directory.

## Architecture

The application is built with a modern React architecture:

- **React frontend** with TypeScript for type safety
- **Three.js** for 3D visualization
- **WebGL** for GPU-accelerated rendering
- **Socket.IO** for real-time communication with the backend
- **Zustand** for state management

## Backend Integration

The React app communicates with the original Node.js backend via:
- Socket.IO for real-time updates
- REST API for configuration management

## Themes

The application supports three themes:
- **Art Critic** - The classic verbose, pretentious language of a French art critic
- **Standard** - A more straightforward technical interface
- **Minimal** - A streamlined interface with minimal text

## Development Notes

- The `/src/store` directory contains the Zustand store for state management
- The `/src/hooks` directory contains custom hooks, including the improved MIDI learn implementation
- The `/src/components` directory is organized by feature area

## Known Issues

- WebGL visualization may not work on older hardware
- MIDI device support depends on browser compatibility
- Some less common MIDI controller message types might not be properly mapped

## License

MIT