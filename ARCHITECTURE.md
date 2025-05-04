# ArtBastard DMX512FTW: The Grand Architecture

*"In the grand theater of digital illumination, each component plays its role in the symphony of light."*

## 🎨 System Overview

```mermaid
graph TB
    subgraph "The Maestro's Podium"
        AB[ArtBastard.sh]
    end

    subgraph "The Digital Canvas (Frontend)"
        React[React Application]
        WebGL[WebGL Visualization]
        ThreeJS[Three.js 3D View]
    end

    subgraph "The Neural Network (Backend)"
        Server[Node.js Server]
        DMX[DMX Protocol Handler]
        MIDI[MIDI Controller]
        OSC[OSC Communication]
    end

    subgraph "The Archives (Data Storage)"
        Config[Configuration]
        Scenes[Scene Library]
        Mappings[MIDI Mappings]
    end

    AB -->|Orchestrates| Server
    AB -->|Launches| React
    Server -->|Conducts| DMX
    Server -->|Interprets| MIDI
    Server -->|Translates| OSC
    React -->|Renders| WebGL
    React -->|Projects| ThreeJS
    Server -->|Archives| Config
    Server -->|Preserves| Scenes
    Server -->|Records| Mappings
```

## 🎭 Component Roles

```mermaid
flowchart TD
    subgraph "The Illuminated Interface"
        direction TB
        MainPage[MainPage.tsx\nThe Grand Canvas]
        DMXControl[DmxControlPanel.tsx\nLight Control Atelier]
        Fixtures[FixtureSetup.tsx\nLuminaire Architecture]
        MIDI[MidiOscSetup.tsx\nDigital Orchestra]
        Scenes[SceneGallery.tsx\nLight Poetry Collection]
        Settings[Settings.tsx\nArtistic Preferences]
    end

    subgraph "The Ethereal Backend"
        direction TB
        Server[server.ts\nMaestro Controller]
        Effects[effects.ts\nChoreography Engine]
        API[api.ts\nArtistic Interface]
    end

    subgraph "The Sacred Scripts"
        direction TB
        ArtBastard[ArtBastard.sh\nThe Grand Conductor]
        Build[build-without-typechecking.js\nRapid Prototype Forge]
    end

    ArtBastard -->|Initiates| Server
    Server -->|Orchestrates| API
    API -->|Conducts| Effects
    MainPage -->|Composes| DMXControl
    MainPage -->|Arranges| Fixtures
    MainPage -->|Coordinates| MIDI
    MainPage -->|Curates| Scenes
    MainPage -->|Configures| Settings
```

## 🎼 Launch Sequence

```mermaid
sequenceDiagram
    participant User as Artiste
    participant Shell as ArtBastard.sh
    participant Server as Node.js Server
    participant React as React Frontend
    participant DMX as DMX Universe
    
    User->>Shell: ./ArtBastard.sh
    Note over Shell: The curtain rises
    
    Shell->>Server: Launch Node.js Server
    Note over Server: The conductor takes position
    
    Shell->>React: Launch React Frontend
    Note over React: The stage illuminates
    
    React->>Server: WebSocket Connection
    Note over React,Server: The digital orchestra tunes
    
    Server->>DMX: Initialize DMX Universe
    Note over DMX: The luminous canvas awakens
    
    React->>User: Interface Ready
    Note over User: The performance begins
```

## 📁 File Purposes

```mermaid
classDiagram
    class EntryPoints {
        ArtBastard.sh: Grand Orchestrator
        server.ts: Backend Maestro
        main.tsx: Frontend Director
    }
    
    class CoreComponents {
        DmxControlPanel: Light Control Suite
        FixtureSetup: Fixture Architecture
        MidiOscSetup: Digital Orchestra Config
        SceneGallery: Performance Library
    }
    
    class DataStorage {
        config.json: System Configuration
        scenes.json: Light Poetry Archive
        midi_mappings.json: Digital Bindings
    }
    
    class Visualizations {
        DmxWebglVisualizer: Light Spectrum Display
        FixtureVisualizer3D: Spatial Illumination
        MidiVisualizer: Digital Input Poetry
    }
    
    EntryPoints --> CoreComponents
    CoreComponents --> DataStorage
    CoreComponents --> Visualizations
```

## 🎹 MIDI & OSC Flow

```mermaid
flowchart LR
    subgraph "Physical Realm"
        MIDI_HW[MIDI Controllers]
        OSC_HW[OSC Devices]
    end
    
    subgraph "Digital Translation"
        MIDI_Handler[MIDI Protocol Handler]
        OSC_Handler[OSC Protocol Handler]
    end
    
    subgraph "Light Manifestation"
        DMX_Universe[DMX Universe]
        Fixtures[Light Fixtures]
    end
    
    MIDI_HW -->|"Digital Touch"| MIDI_Handler
    OSC_HW -->|"Network Whispers"| OSC_Handler
    MIDI_Handler -->|"Artistic Intent"| DMX_Universe
    OSC_Handler -->|"Remote Command"| DMX_Universe
    DMX_Universe -->|"Luminous Reality"| Fixtures
```

*"Each connection is a brushstroke, each protocol a color, and together they paint with light upon the canvas of reality."*

## Usage

To begin the artistic journey:

1. Execute `./ArtBastard.sh` - The grand conductor of our luminous orchestra
2. Select your desired movement from the artistic menu
3. Allow the digital muses to guide your creative expression

Remember: The interface adapts to your artistic temperament through three distinct themes:
- **Art Critic**: For those who appreciate the verbose beauty of artistic expression
- **Standard**: For the pragmatic illuminator
- **Minimal**: For the pure essence of light control

_"Let the dance of photons begin!"_