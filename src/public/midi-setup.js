document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    
    // DOM Elements
    const midiInterfacesList = document.getElementById('midiInterfacesList');
    const refreshMidiInterfacesButton = document.getElementById('refreshMidiInterfaces');
    const midiMessages = document.getElementById('midiMessages');
    const midiMappings = document.getElementById('midiMappings');
    const forgetAllMidiButton = document.getElementById('forgetAllMidi');
    const clearMidiMessagesButton = document.getElementById('clearMidiMessages');
    const themeToggle = document.getElementById('themeToggle');
    const statusMessage = document.getElementById('statusMessage');
    const artnetIndicator = document.getElementById('artnet-indicator');
    const midiInIndicator = document.getElementById('midi-in-indicator');
    const midiOutIndicator = document.getElementById('midi-out-indicator');
    const collapseToggles = document.querySelectorAll('.collapse-toggle');
    const debugOutput = document.getElementById('debugOutput');
    const rawDataToggle = document.getElementById('rawDataToggle');
    const midiVisualizerMode = document.getElementById('midiVisualizerMode');
    const midiVisualizerCanvas = document.getElementById('midiVisualizerCanvas');
    
    // State variables
    let darkMode = true; // Default to dark mode
    let midiInActivity = false;
    let midiOutActivity = false;
    let artnetStatus = false;
    let activeInterfaces = []; // Track connected interfaces
    let showRawData = true; // Default to showing raw data
    let currentVisualizerMode = 'text'; // Default visualizer mode
    let midiDataHistory = []; // Store MIDI data for visualizations
    
    // Activity timeout for MIDI indicators
    const activityTimeout = 300; // 300ms
    let midiInActivityTimeout;
    let midiOutActivityTimeout;
    
    // Initialize toggle buttons for collapsing card sections
    collapseToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const card = toggle.closest('.card');
            const cardBody = card.querySelector('.card-body');
            const cardFooter = card.querySelector('.card-footer');
            
            if (cardBody.style.display === 'none') {
                cardBody.style.display = 'block';
                if (cardFooter) cardFooter.style.display = 'flex';
                toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
            } else {
                cardBody.style.display = 'none';
                if (cardFooter) cardFooter.style.display = 'none';
                toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
            }
        });
    });
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        darkMode = !darkMode;
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        themeToggle.innerHTML = darkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        log(`Theme changed to ${darkMode ? 'dark' : 'light'} mode - the canvas shifts its tonal palette`);
    });
    
    // Socket event handlers
    socket.on('connect', () => {
        showMessage('Connected to the luminous server', 'success');
        updateArtnetStatus(true);
    });
    
    socket.on('disconnect', () => {
        showMessage('Connection to the server lost - the canvas grows dark', 'error');
        updateArtnetStatus(false);
    });
    
    // MIDI interface handling
    socket.on('midiInterfaces', (interfaces) => {
        console.log('Received MIDI interfaces:', interfaces);
        updateMidiInterfacesList(interfaces);
        log(`Discovered ${interfaces ? interfaces.length : 0} MIDI muses in the digital realm`);
    });
    
    socket.on('midiInputsActive', (activeInputs) => {
        activeInterfaces = activeInputs;
        updateMidiInterfacesList();
    });
    
    // Refresh MIDI interfaces button
    refreshMidiInterfacesButton.addEventListener('click', () => {
        socket.emit('getMidiInterfaces');
        log('Refreshing available MIDI interfaces');
    });
    
    // Function to update the MIDI interfaces list
    function updateMidiInterfacesList(interfaces) {
        if (!midiInterfacesList) {
            console.error('midiInterfacesList element not found!');
            return;
        }
        
        console.log('Updating MIDI interfaces list with:', interfaces);
        
        // If no interfaces were provided, use the cached list of known interfaces
        const knownInterfaces = interfaces || [];
        
        // Clear existing content
        midiInterfacesList.innerHTML = '';
        
        if (!knownInterfaces || knownInterfaces.length === 0) {
            console.log('No MIDI interfaces detected');
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-interfaces';
            emptyMessage.textContent = 'No MIDI interfaces detected. Connect a device and refresh.';
            midiInterfacesList.appendChild(emptyMessage);
            return;
        }
        
        const interfaceTable = document.createElement('table');
        interfaceTable.className = 'interface-table';
        
        const tableHeader = document.createElement('thead');
        tableHeader.innerHTML = `
            <tr>
                <th>Interface Name</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        `;
        interfaceTable.appendChild(tableHeader);
        
        const tableBody = document.createElement('tbody');
        
        knownInterfaces.forEach(interfaceName => {
            const isActive = activeInterfaces.includes(interfaceName);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${interfaceName}</td>
                <td class="interface-status ${isActive ? 'active' : 'inactive'}">${isActive ? 'Connected' : 'Disconnected'}</td>
                <td>
                    ${isActive 
                        ? `<button class="disconnect-interface danger-button" data-interface="${interfaceName}"><i class="fas fa-unlink"></i> Disconnect</button>` 
                        : `<button class="connect-interface success-button" data-interface="${interfaceName}"><i class="fas fa-link"></i> Connect</button>`}
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        interfaceTable.appendChild(tableBody);
        midiInterfacesList.appendChild(interfaceTable);
        
        // Add event listeners for connection/disconnection
        document.querySelectorAll('.connect-interface').forEach(button => {
            button.addEventListener('click', () => {
                const interfaceName = button.dataset.interface;
                socket.emit('selectMidiInterface', interfaceName);
                log(`Establishing communion with MIDI muse: ${interfaceName}`);
            });
        });
        
        document.querySelectorAll('.disconnect-interface').forEach(button => {
            button.addEventListener('click', () => {
                const interfaceName = button.dataset.interface;
                socket.emit('disconnectMidiInterface', interfaceName);
                log(`Severing connection with MIDI muse: ${interfaceName}`);
            });
        });
    }
    
    socket.on('midiInterfaceSelected', (interfaceName) => {
        showMessage(`Digital communion established with ${interfaceName}`, 'success');
        log(`Connected to MIDI interface: ${interfaceName}`);
    });
    
    socket.on('midiInterfaceError', (error) => {
        showMessage(`Failed to establish the digital connection: ${error}`, 'error');
        log(`MIDI interface error: ${error}`);
    });
    
    // MIDI message handling and visualization
    socket.on('midiMessage', (message) => {
        console.log('Received MIDI message:', message);
        triggerMidiInActivity();
        
        // Add message to history for visualization
        midiDataHistory.push({
            timestamp: Date.now(),
            message: message
        });
        
        // Limit history size
        if (midiDataHistory.length > 200) {
            midiDataHistory.shift();
        }
        
        // Update visualizer
        updateMidiVisualizer();
        
        // Show text message if raw data display is enabled
        if (showRawData) {
            const messageElement = document.createElement('div');
            messageElement.className = 'midi-message';
            
            let messageContent = '';
            const timestamp = new Date().toLocaleTimeString();
            const source = message.source ? `<span class="source">[${message.source}]</span>` : '';
            
            if (message._type === 'noteon' || message._type === 'noteoff') {
                messageContent = `<span class="timestamp">${timestamp}</span> ${source} <span class="message-type">${message._type}</span> - Channel: ${message.channel}, Note: ${message.note}, Velocity: ${message.velocity}`;
                
                // Add note name if it's a note message
                const noteName = getNoteNameFromNumber(message.note);
                if (noteName) {
                    messageContent += ` (${noteName})`;
                }
            } else if (message._type === 'cc') {
                messageContent = `<span class="timestamp">${timestamp}</span> ${source} <span class="message-type">${message._type}</span> - Channel: ${message.channel}, Controller: ${message.controller}, Value: ${message.value}`;
            } else {
                messageContent = `<span class="timestamp">${timestamp}</span> ${source} - ${JSON.stringify(message)}`;
            }
            
            messageElement.innerHTML = messageContent;
            midiMessages.appendChild(messageElement);
            midiMessages.scrollTop = midiMessages.scrollHeight;
        }
    });
    
    // Convert MIDI note number to note name
    function getNoteNameFromNumber(noteNumber) {
        if (typeof noteNumber !== 'number') return null;
        
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(noteNumber / 12) - 1;
        const noteName = noteNames[noteNumber % 12];
        
        return `${noteName}${octave}`;
    }
    
    // Raw data toggle
    if (rawDataToggle) {
        rawDataToggle.addEventListener('change', () => {
            showRawData = rawDataToggle.checked;
            if (!showRawData) {
                midiMessages.innerHTML = '<p class="empty-messages">Raw data display disabled. Enable to see detailed MIDI messages.</p>';
            } else {
                midiMessages.innerHTML = '';
            }
        });
    }
    
    // MIDI visualizer mode change
    if (midiVisualizerMode) {
        midiVisualizerMode.addEventListener('change', () => {
            currentVisualizerMode = midiVisualizerMode.value;
            updateMidiVisualizer();
        });
    }
    
    // MIDI Visualizer
    function updateMidiVisualizer() {
        if (!midiVisualizerCanvas) return;
        
        const ctx = midiVisualizerCanvas.getContext('2d');
        const width = midiVisualizerCanvas.width;
        const height = midiVisualizerCanvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw based on selected mode
        switch (currentVisualizerMode) {
            case 'heatmap':
                drawMidiHeatmap(ctx, width, height);
                break;
                
            case 'piano':
                drawMidiPianoRoll(ctx, width, height);
                break;
                
            case 'text':
            default:
                // Text mode doesn't use the canvas
                break;
        }
    }
    
    // Draw MIDI heatmap visualization
    function drawMidiHeatmap(ctx, width, height) {
        // Create heatmap for CC values (128 controllers x 16 channels)
        const cellWidth = width / 128;
        const cellHeight = height / 16;
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        
        // Horizontal lines (channels)
        for (let i = 0; i <= 16; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * cellHeight);
            ctx.lineTo(width, i * cellHeight);
            ctx.stroke();
        }
        
        // Vertical lines (every 8 controllers)
        for (let i = 0; i <= 128; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i * cellWidth, 0);
            ctx.lineTo(i * cellWidth, height);
            ctx.stroke();
        }
        
        // Get recent messages (last 2 seconds)
        const recentMessages = midiDataHistory.filter(
            data => Date.now() - data.timestamp < 2000 && data.message._type === 'cc'
        );
        
        // Draw active cells
        recentMessages.forEach(data => {
            const msg = data.message;
            if (msg.controller !== undefined && msg.channel !== undefined) {
                const x = msg.controller * cellWidth;
                const y = (msg.channel - 1) * cellHeight;
                
                // Age of message affects opacity
                const age = (Date.now() - data.timestamp) / 2000; // 0-1 range
                const opacity = 1 - age;
                
                // Value affects color intensity
                const value = msg.value / 127;
                
                ctx.fillStyle = `rgba(0, 255, 255, ${opacity * value})`;
                ctx.fillRect(x, y, cellWidth, cellHeight);
                
                // Draw value text for recent high-value messages
                if (opacity > 0.7 && value > 0.5) {
                    ctx.fillStyle = 'white';
                    ctx.font = '8px monospace';
                    ctx.fillText(msg.value.toString(), x + 2, y + cellHeight - 2);
                }
            }
        });
        
        // Add channel labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px monospace';
        for (let i = 1; i <= 16; i++) {
            ctx.fillText(`Ch ${i}`, 2, i * cellHeight - 2);
        }
    }
    
    // Draw MIDI piano roll visualization
    function drawMidiPianoRoll(ctx, width, height) {
        const whiteKeyWidth = width / 75; // 75 white keys on a full piano
        const blackKeyWidth = whiteKeyWidth * 0.6;
        const whiteKeyHeight = height * 0.8;
        const blackKeyHeight = height * 0.5;
        
        // Get note patterns
        const isBlackKey = [false, true, false, true, false, false, true, false, true, false, true, false];
        
        // Draw piano keys
        let xPos = 0;
        for (let note = 21; note <= 108; note++) { // Standard 88-key piano range
            const octave = Math.floor(note / 12) - 1;
            const noteInOctave = note % 12;
            const isBlack = isBlackKey[noteInOctave];
            
            if (!isBlack) {
                // Draw white key
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(xPos, 0, whiteKeyWidth, whiteKeyHeight);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.strokeRect(xPos, 0, whiteKeyWidth, whiteKeyHeight);
                
                // Move to next white key position
                xPos += whiteKeyWidth;
            }
        }
        
        // Reset and draw black keys on top
        xPos = 0;
        for (let note = 21; note <= 108; note++) {
            const octave = Math.floor(note / 12) - 1;
            const noteInOctave = note % 12;
            const isBlack = isBlackKey[noteInOctave];
            
            if (!isBlack) {
                xPos += whiteKeyWidth;
            } else {
                // Draw black key
                const prevWhiteKeyPosition = xPos - whiteKeyWidth;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(prevWhiteKeyPosition + (whiteKeyWidth - blackKeyWidth/2), 0, blackKeyWidth, blackKeyHeight);
            }
        }
        
        // Draw active notes
        const recentNoteMessages = midiDataHistory.filter(
            data => Date.now() - data.timestamp < 1000 && 
                  (data.message._type === 'noteon' || data.message._type === 'noteoff')
        );
        
        recentNoteMessages.forEach(data => {
            const msg = data.message;
            if (msg.note !== undefined && msg.note >= 21 && msg.note <= 108) {
                const normalized = msg.note - 21; // Normalize to 0-based index
                const octave = Math.floor(msg.note / 12) - 1;
                const noteInOctave = msg.note % 12;
                const isBlack = isBlackKey[noteInOctave];
                
                // Calculate key position
                let keyX = 0;
                let whiteKeyCount = 0;
                for (let n = 21; n <= msg.note; n++) {
                    if (!isBlackKey[n % 12]) {
                        whiteKeyCount++;
                    }
                }
                keyX = (whiteKeyCount - 1) * whiteKeyWidth;
                
                // Age of message affects opacity
                const age = (Date.now() - data.timestamp) / 1000; // 0-1 range
                const opacity = 1 - age;
                
                // Note on/off and velocity affect color
                const isNoteOn = msg._type === 'noteon' && msg.velocity > 0;
                const velocity = msg.velocity / 127;
                
                if (isNoteOn) {
                    if (isBlack) {
                        ctx.fillStyle = `rgba(0, 255, 255, ${opacity * velocity})`;
                        ctx.fillRect(keyX + (whiteKeyWidth - blackKeyWidth/2), 0, blackKeyWidth, blackKeyHeight);
                    } else {
                        ctx.fillStyle = `rgba(0, 200, 255, ${opacity * velocity})`;
                        ctx.fillRect(keyX, 0, whiteKeyWidth, whiteKeyHeight);
                    }
                    
                    // Draw channel indicator
                    ctx.fillStyle = 'white';
                    ctx.font = '8px monospace';
                    const channelText = `Ch${msg.channel}`;
                    if (isBlack) {
                        ctx.fillText(channelText, keyX + (whiteKeyWidth - blackKeyWidth/2) + 2, blackKeyHeight - 5);
                    } else {
                        ctx.fillText(channelText, keyX + 2, whiteKeyHeight - 5);
                    }
                }
            }
        });
    }
    
    socket.on('midiMappingUpdate', (mappings) => {
        midiMappings.innerHTML = '';
        
        if (Object.keys(mappings).length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-mappings';
            emptyMessage.textContent = 'No correspondences have been established yet. The digital muse awaits your guidance.';
            midiMappings.appendChild(emptyMessage);
            return;
        }
        
        const mappingTable = document.createElement('table');
        mappingTable.className = 'mapping-table';
        
        const tableHeader = document.createElement('thead');
        tableHeader.innerHTML = `
            <tr>
                <th>MIDI Channel</th>
                <th>Controller/Note</th>
                <th>DMX Channel</th>
                <th>Actions</th>
            </tr>
        `;
        mappingTable.appendChild(tableHeader);
        
        const tableBody = document.createElement('tbody');
        
        Object.entries(mappings).forEach(([midiControl, dmxChannel]) => {
            const [channel, controller] = midiControl.split(':');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${channel}</td>
                <td>${controller}</td>
                <td>${dmxChannel}</td>
                <td><button class="forget-mapping" data-mapping="${midiControl}"><i class="fas fa-unlink"></i></button></td>
            `;
            tableBody.appendChild(row);
        });
        
        mappingTable.appendChild(tableBody);
        midiMappings.appendChild(mappingTable);
        
        // Add event listeners for individual mapping deletion
        document.querySelectorAll('.forget-mapping').forEach(button => {
            button.addEventListener('click', () => {
                const mapping = button.dataset.mapping;
                socket.emit('forgetMidiMapping', { mapping });
                log(`Dissolving correspondence for MIDI control ${mapping}`);
            });
        });
    });
    
    forgetAllMidiButton.addEventListener('click', () => {
        if (confirm('Are you certain you wish to dissolve all established correspondences between the physical and virtual realms? This act of digital severance cannot be undone.')) {
            socket.emit('forgetAllMidiMappings');
            log('Initiating dissolution of all MIDI correspondences');
        }
    });
    
    socket.on('allMidiMappingsForgotten', () => {
        showMessage('All digital correspondences have been dissolved', 'success');
        midiMappings.innerHTML = '<p class="empty-mappings">The slate has been wiped clean. A new canvas awaits your artistic mappings.</p>';
    });
    
    socket.on('midiMappingForgotten', ({ mapping }) => {
        showMessage(`Correspondence for ${mapping} has been dissolved`, 'success');
        socket.emit('getMidiMappings');
    });
    
    if (clearMidiMessagesButton) {
        clearMidiMessagesButton.addEventListener('click', () => {
            midiMessages.innerHTML = '';
            log('Ethereal messages swept from the digital canvas');
        });
    }
    
    socket.on('midiSent', (data) => {
        triggerMidiOutActivity();
    });
    
    socket.on('artnetStatus', ({ status }) => {
        updateArtnetStatus(status === 'alive');
    });
    
    // Status indicator functions
    function updateArtnetStatus(isConnected) {
        artnetStatus = isConnected;
        if (artnetIndicator) {
            if (isConnected) {
                artnetIndicator.classList.add('connected');
            } else {
                artnetIndicator.classList.remove('connected');
            }
        }
    }
    
    function triggerMidiInActivity() {
        if (midiInIndicator) {
            midiInIndicator.classList.add('active');
            if (midiInActivityTimeout) clearTimeout(midiInActivityTimeout);
            midiInActivityTimeout = setTimeout(() => {
                midiInIndicator.classList.remove('active');
            }, activityTimeout);
        }
    }
    
    function triggerMidiOutActivity() {
        if (midiOutIndicator) {
            midiOutIndicator.classList.add('active');
            if (midiOutActivityTimeout) clearTimeout(midiOutActivityTimeout);
            midiOutActivityTimeout = setTimeout(() => {
                midiOutIndicator.classList.remove('active');
            }, activityTimeout);
        }
    }
    
    // Utility functions
    function showMessage(message, type) {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = type;
            statusMessage.style.display = 'block';
    
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        }
    }
    
    function log(message) {
        if (debugOutput) {
            const timestamp = new Date().toLocaleTimeString();
            debugOutput.textContent = `${timestamp} - ${message}\n${debugOutput.textContent}`;
            
            // Trim log if it gets too long
            if (debugOutput.textContent.length > 5000) {
                debugOutput.textContent = debugOutput.textContent.substring(0, 5000) + "...";
            }
        }
    }
    
    // Initialize MIDI visualizer
    if (midiVisualizerCanvas) {
        // Set up animation loop for visualizer
        let lastTimestamp = 0;
        function animateVisualizer(timestamp) {
            // Only update every ~30ms for performance
            if (timestamp - lastTimestamp > 30) {
                updateMidiVisualizer();
                lastTimestamp = timestamp;
            }
            requestAnimationFrame(animateVisualizer);
        }
        requestAnimationFrame(animateVisualizer);
    }
    
    // Request initial MIDI interfaces and mappings
    socket.emit('getMidiInterfaces');
    socket.emit('getMidiMappings');
    log('MIDI Atelier initialized - awaiting your artistic correspondences');
});