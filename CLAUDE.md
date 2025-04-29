# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure
- `/src/` - TypeScript backend code
- `/react-app/` - React frontend (new version)
- `/data/` - Configuration and scene files
- `/logs/` - Application logs

## Build Commands
### Backend
- Build: `npm run build` - Compiles TypeScript and copies static files
- Dev mode: `npm run dev` - Run with ts-node for development
- Watch mode: `npm run start:dev` - Uses nodemon to restart on changes
- Start: `npm start` - Run the built application
- MIDI monitor: `npm run midi-console` - Run MIDI monitoring utility
- Type check: `npx tsc --noEmit` - Validate TypeScript without generating output

### React Frontend
- Navigate to react-app directory first: `cd react-app`
- Build React: `npm run build` - Creates production build for frontend
- Dev mode: `npm run start` - Starts development server with live reload
- Complete build: `./build-react.sh` - Builds both backend and frontend

### WSL-Specific Commands
- Backend only build: `./build-backend-only.sh` - Skip React frontend build
- Run in WSL: `./run-in-wsl.sh` - Optimized for WSL environment

## Code Style Guidelines
- Use TypeScript with strict typing and proper interface definitions
- Format: 4-space indentation, consistent spacing around operators
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces, UPPER_CASE for constants
- Imports: Group by type (node modules first, then local modules)
- Error handling: Use try/catch blocks with detailed error logging using the `log()` function
- Async code: Use Promises and async/await consistently
- Comments: Include JSDoc comments for functions and complex logic
- Logging: Use the existing logging system (`log()` function) rather than console.log

## React Frontend Guidelines
- Use functional components with React hooks
- Use TypeScript for all components and hooks
- Follow the existing component structure and naming conventions
- Use Zustand for state management
- Use CSS modules for styling (.module.scss files)
- Use Three.js for 3D visualization through react-three-fiber

## Architecture Notes
- DMX control via ArtNet protocol (dmxnet library)
- MIDI integration using easymidi library
- OSC support through osc library
- Web interface served by Express on port 3001
- Socket.io for real-time communication between UI and server
- React frontend with Zustand for state management
- WebGL for DMX visualization
- Three.js for 3D fixture visualization

## WSL Compatibility Notes
- Hardware MIDI devices are not accessible in WSL
- Browser MIDI API works in WSL environments
- Running in WSL: use `/public` interface rather than React frontend
- For hardware MIDI support, run in native Windows environment

## Testing and Verification
Before committing changes:
1. Build both backend and frontend: `./build-react.sh` (or backend-only: `./build-backend-only.sh`)
2. Start the application: `npm start`
3. Test DMX output with actual devices or ArtNet monitors
4. Verify MIDI functionality with connected controllers or browser MIDI
5. Check all UI themes (Art Critic, Standard, Minimal)
6. Test visualizations for performance

## API Documentation
The backend API is structured as follows:
- `/api/state` - Get initial application state
- `/api/dmx` - Set DMX channel values
- `/api/midi/*` - MIDI related endpoints
- `/api/scenes/*` - Scene management endpoints
- `/api/config/*` - Configuration endpoints

Socket.IO events handle real-time communication for:
- DMX updates
- MIDI messages
- Scene changes
- Status updates