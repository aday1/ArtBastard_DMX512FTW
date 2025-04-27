# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Build: `npm run build` - Compiles TypeScript and copies static files
- Dev mode: `npm run dev` - Run with ts-node for development
- Watch mode: `npm run start:dev` - Uses nodemon to restart on changes
- Start: `npm start` - Run the built application
- MIDI monitor: `npm run midi-console` - Run MIDI monitoring utility
- Type check: `npx tsc --noEmit` - Validate TypeScript without generating output

## Code Style Guidelines
- Use TypeScript with strict typing and proper interface definitions
- Format: 4-space indentation, consistent spacing around operators
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces, UPPER_CASE for constants
- Imports: Group by type (node modules first, then local modules)
- Error handling: Use try/catch blocks with detailed error logging using the `log()` function
- Async code: Use Promises and async/await consistently
- Comments: Include JSDoc comments for functions and complex logic
- Logging: Use the existing logging system (`log()` function) rather than console.log

## Architecture Notes
- DMX control via ArtNet protocol (dmxnet library)
- MIDI integration using easymidi library
- OSC support through osc library
- Web interface served by Express on port 3001
- Socket.io for real-time communication between UI and server

Before committing changes, manually verify functionality as no automated tests exist.