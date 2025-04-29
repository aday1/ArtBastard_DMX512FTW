# ArtBastard DMX512FTW Refactor Plan

## Current System Analysis

### Architecture
The current system is built with:
- Node.js backend using Express
- Socket.IO for real-time communication
- TypeScript for type safety
- Plain JavaScript front-end with no framework
- DMXnet for ArtNet DMX control
- EasyMIDI for MIDI device handling

### Key Issues
1. **MIDI Learn Functionality Issues**:
   - Inconsistent event handling between server and client
   - Race conditions in MIDI learn state management
   - Lack of visual feedback during learn process
   - Multiple events with similar functionality (`startMidiLearn` and `learnMidiMapping`)

2. **UI/UX Limitations**:
   - No GPU acceleration for DMX visualization
   - Limited interactive features
   - No 3D visualization of fixtures
   - Limited responsive design

## Refactor Goals

1. **Modern Architecture**:
   - React front-end for component-based UI
   - WebGL/Three.js for 3D visualization
   - TypeScript throughout
   - Improved state management

2. **Enhanced MIDI Learn**:
   - Robust and consistent implementation
   - Clear visual feedback
   - Support for different MIDI message types
   - Reliable mapping storage

3. **Advanced Visualization**:
   - GPU-accelerated DMX channel visualization
   - Interactive 3D fixture placement
   - Real-time visual feedback for MIDI control
   - Responsive design for different devices

## Technology Stack

### Frontend
- **React** for UI components and state management
- **TypeScript** for type safety
- **Three.js** for 3D visualization
- **react-three-fiber** for React integration with Three.js
- **Zustand** for state management
- **SASS/CSS Modules** for styling
- **WebGL** for GPU-accelerated rendering

### Backend
- **Node.js** with Express
- **TypeScript**
- **Socket.IO** for real-time communication
- **DMXnet** for ArtNet control
- **EasyMIDI** for MIDI device handling

## Architecture Design

### Backend Architecture
1. **Core Services**:
   - MIDI Service: Handles MIDI device connections and message processing
   - DMX Service: Manages DMX universe and channel values
   - Scene Service: Handles scene storage and retrieval
   - Socket Service: Manages WebSocket connections and events

2. **API Structure**:
   - RESTful endpoints for configuration
   - Socket.IO events for real-time updates
   - Clear separation of concerns between services

### Frontend Architecture
1. **Component Structure**:
   - Layout components for overall UI structure
   - Functional components for specific features
   - Three.js components for 3D visualization

2. **State Management**:
   - Zustand for global state management
   - React hooks for component-level state
   - Socket.IO client for real-time updates

3. **Visualization Components**:
   - DMX Universe Visualizer: GPU-accelerated visualization of all DMX channels
   - Fixture Visualizer: 3D representation of fixtures in space
   - MIDI Activity Monitor: Real-time visualization of MIDI activity

## Implementation Plan

### Phase 1: Project Setup
1. Initialize React application with TypeScript
2. Set up Three.js and WebGL integration
3. Configure build system and development environment
4. Establish API structure and communication layer

### Phase 2: Backend Refactoring
1. Reorganize existing backend code into services
2. Enhance MIDI handling with improved error management
3. Refine DMX control with better state management
4. Implement robust MIDI learn functionality

### Phase 3: Frontend Development
1. Create core UI components
2. Implement 3D visualization with Three.js
3. Develop GPU-accelerated DMX visualization
4. Build improved MIDI learn interface with visual feedback

### Phase 4: Integration and Testing
1. Connect frontend and backend
2. Test with various MIDI devices
3. Optimize performance
4. User testing and feedback

## Detailed MIDI Learn Implementation

The new MIDI Learn implementation will feature:

1. **Clear State Management**:
   - Dedicated state for MIDI learn mode
   - Timeouts for automatic cancellation
   - Visual indicators for active learning state

2. **User Interaction Flow**:
   - User selects a DMX channel for mapping
   - System enters MIDI learn mode with visual feedback
   - User triggers MIDI control (button press, knob turn)
   - System maps the control to the selected channel
   - Visual confirmation of successful mapping

3. **Robust Error Handling**:
   - Timeout handling
   - Duplicate mapping detection
   - Clear error messages
   - Automatic recovery from failures

## Visual Design Principles

1. **Retain ArtBastard Identity**:
   - Keep the unique "art critic" personality and humor
   - Maintain the distinctive visual language
   - Preserve the whimsical naming conventions

2. **Enhance with Modern UI**:
   - Responsive design for all device sizes
   - Consistent color scheme and typography
   - Improved visual hierarchy and layout
   - GPU-accelerated animations and transitions

3. **3D Visualization Style**:
   - Abstract but functional representation of DMX fixtures
   - Interactive placement in 3D space
   - Visual feedback for MIDI control actions
   - Realistic lighting effects for DMX output

## Development Roadmap

### Week 1-2: Setup and Core Architecture
- Project setup with React, TypeScript, and Three.js
- Backend service restructuring
- Basic communication layer

### Week 3-4: MIDI and DMX Implementation
- Enhanced MIDI device handling
- Improved DMX control interface
- New MIDI learn implementation

### Week 5-6: Visualization Development
- 3D fixture visualization
- GPU-accelerated DMX channel visualization
- MIDI activity visualization

### Week 7-8: Integration and Polishing
- Full integration of all components
- Testing across different devices
- Performance optimization
- Final polish and documentation