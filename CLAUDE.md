# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure
- `/src/` - TypeScript backend code
  - `server.ts` - Main server implementation
  - `api.ts` - API endpoints and routing
  - `effects.ts` - DMX effects engine
  - `types/` - TypeScript type definitions
- `/react-app/` - React frontend
  - `components/` - React components by feature
  - `context/` - React context providers
  - `hooks/` - Custom React hooks
  - `store/` - Zustand state management
  - `styles/` - Global SCSS styles
- `/data/` - Configuration and scene files
- `/logs/` - Application logs
- `_UNUSED_SRC/` - Legacy code for reference

## Build Commands

### Backend
- Build: `npm run build` - Compiles TypeScript and static files
- Dev mode: `npm run dev` - Run with ts-node
- Watch mode: `npm run start:dev` - Uses nodemon
- Start: `npm start` - Run the built application
- MIDI monitor: `npm run midi-console` - MIDI monitoring utility
- Type check: `npx tsc --noEmit` - Validate TypeScript

### React Frontend
- Navigate to react-app: `cd react-app`
- Build React: `npm run build` - Production build
- Dev mode: `npm run start` - Development server
- Complete build: `./build-react.sh` - Builds backend and frontend

### WSL-Specific
- Backend only: `./build-backend-only.sh` - Skip React build
- Run in WSL: `./run-in-wsl.sh` - WSL optimized mode

## Code Style Guidelines
- Use TypeScript with strict typing
- Format: 4-space indentation, consistent operator spacing
- Naming: 
  - camelCase: variables/functions
  - PascalCase: classes/interfaces/components
  - UPPER_CASE: constants
- Imports: Group by type (node modules first, then local)
- Error handling: Try/catch with detailed logging
- Async code: Use Promises and async/await
- Comments: JSDoc for functions and complex logic
- Logging: Use log() function, not console.log

## React Guidelines
- Functional components with hooks
- TypeScript for all components
- Follow existing component structure
- Zustand for state management
- CSS modules (.module.scss)
- react-three-fiber for 3D visualization

## WebGL/Three.js Guidelines
- Use react-three-fiber for React integration
- Maintain 60fps performance target
- Implement proper cleanup in useEffect
- Use instances for multiple similar objects
- Handle window resize events
- Consider WebGL fallbacks when needed

## Architecture Notes
- DMX control via ArtNet (dmxnet)
- MIDI via easymidi and WebMIDI API
- OSC support through osc library
- Express server on port 3001
- Socket.io for real-time updates
- Zustand for state management
- WebGL for visualizations
- Three.js for 3D fixtures

## Testing Guidelines
Before committing:
1. Run complete build: `./build-react.sh`
2. Start application: `npm start`
3. Test DMX output
4. Verify MIDI functionality
5. Check all UI themes
6. Test visualizations
7. Verify responsive design

## API Structure
### REST Endpoints
- `/api/state` - Application state
- `/api/dmx` - DMX control
- `/api/midi/*` - MIDI operations
- `/api/scenes/*` - Scene management
- `/api/config/*` - Configuration

### Socket.IO Events
- DMX updates
- MIDI messages
- Scene changes
- Status updates
- Visual feedback

## Error Handling
- Use TypeScript for type safety
- Implement proper error boundaries
- Log errors with context
- Provide user feedback
- Handle timeout scenarios
- Manage WebSocket reconnection