# ArtBastard DMX512FTW: The Luminary Palette

*"Where technicians become artists, and artists become luminescent technicians."*

ArtBastard DMX512FTW is not merely a DMX lighting controller—it is a canvas for the ephemeral art of light, a portal through which the discerning illumination connoisseur may orchestrate symphonies of photonic expression. This web-based atelier empowers both the technically inclined and the aesthetically driven to sculpt with light, creating immersive environments that transcend the mundane boundaries of conventional illumination.

## Artistic Capabilities

- **Luminous Orchestration**: Curate your DMX channels with horizontal sliders, each a brushstroke in your light composition
- **Fixture Architecture**: Define and arrange lighting fixtures with meticulous precision, as a sculptor arranges elements in space
- **Collective Expressions**: Group fixtures into ensembles for harmonious control and unified artistic statements
- **Scene Composition**: Capture, preserve, and recall moments of brilliance with scene management
- **MIDI Dialogues**: Establish conversations between physical controllers and virtual parameters
- **OSC Communications**: Extend your artistic reach across networks with Open Sound Control protocols
- **ArtNET Manifestation**: Project your vision across ethernet, embracing the digital medium of light conveyance
- **Chromatic Synchronicity**: Real-time updates ensure your vision remains coherent across all viewing platforms
- **Configurational Preservation**: Archive your creative decisions for posterity or future revivals

## Technical Prerequisites

- Raspberry Pi or any Linux/Windows system with proper sensibilities
- Git (for acquiring this repository of light)
- Internet connectivity (for gathering the necessary digital components)
- A soul prepared to witness the fusion of technology and artistic expression

## Installation on Raspberry Pi

1. **Prepare your canvas** by updating your Raspberry Pi:
   ```
   sudo apt-get update
   sudo apt-get upgrade
   ```

2. **Acquire the necessary tools**:
   ```
   sudo apt-get install git
   ```

3. **Summon this repository into your local dimension**:
   ```
   git clone https://github.com/aday1/ArtBastard_DMX512FTW
   cd ArtBastard_DMX512FTW
   ```

4. **Bestow executable permissions upon the installation script**:
   ```
   chmod +x install.sh
   ```

5. **Initiate the transformative process**:
   ```
   ./install.sh
   ```

   This ritual will:
   - Update your system's knowledge base
   - Install Node.js and npm, the foundational elements
   - Establish build essentials for proper construction
   - Incorporate dependencies specific to the art of DMX
   - Install project-specific components
   - Create the necessary spatial arrangements
   - Compile the application into its executable form

6. **Breathe life into your creation**:
   ```
   npm start
   ```

7. **Witness the manifestation** by navigating to `http://<YOUR_RASPBERRY_PI>:3001` in your preferred browser of truth.

## Windows Installation

For those embracing the Windows aesthetic, a streamlined path to illumination awaits:

1. Ensure Git is installed on your system (acquire from [git-scm.com](https://git-scm.com/))

2. Clone the repository using Git Bash or Command Prompt:
   ```
   git clone https://github.com/aday1/ArtBastard_DMX512FTW
   cd ArtBastard_DMX512FTW
   ```

3. Simply execute the provided batch script to initiate the installation process:
   ```
   setup.bat
   ```

4. The application will automatically launch upon completion. Your browser will be invited to visit `http://localhost:3001`

## Manual Installation (for the Individualist)

For those who prefer to curate their installation experience:

1. Ensure Node.js (v14 or later) and npm have been properly introduced to your system.

2. Gather the necessary components:
   ```
   npm install
   ```

3. Establish the data sanctuary:
   ```
   mkdir -p data
   ```

4. Manifest the application:
   ```
   npm run build
   ```

5. Animate your creation:
   ```
   npm start
   ```

## The Artistic Process

1. After initiating the application, direct your consciousness to `http://localhost:3001` (or the address of your host device).
2. Utilize the interface to compose with light, arrange fixtures, form collectives, and preserve expressions.
3. Establish dialogues with MIDI devices, OSC protocols, and ArtNET vessels as your composition requires.

### Creative Features

- **Luminous Canvas**: The main control interface with sliders that respond to your artistic intentions.
- **Fixture Composition**: Define the nature and behavior of each light source in your installation.
- **Collective Arrangements**: Group fixtures for unified control and expression.
- **Scene Gallery**: Preserve and recall moments of brilliance, each with its own OSC communication pathway.
- **MIDI Dialogues**: Map physical controls to virtual parameters for tactile artistic expression.
- **OSC Critique**: Monitor incoming OSC messages to understand external influences.
- **ArtNET Discovery**: Identify and connect with ArtNET devices across your network.
- **MIDI Observation**: Witness incoming MIDI communications in real-time.
- **Settings Management**: Archive, resurrect, or obliterate configurations as your artistic vision evolves.

## Configuration

- The default ArtNET parameters may be adjusted in the `src/index.ts` file for those inclined toward code as a medium.
- OSC configurations can be tailored in the same location.
- The web interface provides comprehensive controls for those who prefer visual composition.

## Troubleshooting the Artistic Process

- Permission barriers may be overcome by invoking `sudo` when executing commands.
- Ensure your system is connected to the digital commons during installation.
- If Node.js versions create temporal conflicts, consider employing `nvm` to align with the appropriate version.

## Contributing to the Collective

Artistic contributions are welcomed with open arms! Feel empowered to submit a Pull Request to enhance this communal expression.

## Licensing

This project embraces the open-source philosophy under the [MIT License](LICENSE), encouraging the free flow of creative potential.

## Support and Dialogue

Should you encounter obstacles or seek clarification, please open an issue in the GitHub repository to initiate a discourse.

## Acknowledgements

Profound appreciation is extended to Claude, the artificial intelligence that has contributed to the development and documentation of this artistic tool. We acknowledge the symbiotic relationship between human creativity and computational assistance in this era of collaborative expression.