document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    
    // DOM Elements
    const midiInterfaceSelect = document.getElementById('midiInterface');
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
    
    // State variables
    let darkMode = true; // Default to dark mode
    let midiInActivity = false;
    let midiOutActivity = false;
    let artnetStatus = false;
    
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
    
    socket.on('midiInterfaces', (interfaces) => {
        midiInterfaceSelect.innerHTML = '<option value="">Select a digital muse...</option>';
        interfaces.forEach(int => {
            const option = document.createElement('option');
            option.value = int;
            option.textContent = int;
            midiInterfaceSelect.appendChild(option);
        });
        log(`Discovered ${interfaces.length} MIDI muses in the digital realm`);
    });
    
    midiInterfaceSelect.addEventListener('change', (event) => {
        const selectedInterface = event.target.value;
        if (selectedInterface) {
            socket.emit('selectMidiInterface', selectedInterface);
            log(`Establishing communion with MIDI muse: ${selectedInterface}`);
        }
    });
    
    socket.on('midiInterfaceSelected', (interfaceName) => {
        showMessage(`Digital communion established with ${interfaceName}`, 'success');
        log(`Connected to MIDI interface: ${interfaceName}`);
    });
    
    socket.on('midiInterfaceError', (error) => {
        showMessage(`Failed to establish the digital connection: ${error}`, 'error');
        log(`MIDI interface error: ${error}`);
    });
    
    socket.on('midiMessage', (message) => {
        triggerMidiInActivity();
        
        const messageElement = document.createElement('div');
        messageElement.className = 'midi-message';
        
        let messageContent = '';
        if (message._type === 'noteon' || message._type === 'noteoff') {
            messageContent = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> - <span class="message-type">${message._type}</span> - Channel: ${message.channel}, Note: ${message.note}, Velocity: ${message.velocity}`;
        } else if (message._type === 'cc') {
            messageContent = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> - <span class="message-type">${message._type}</span> - Channel: ${message.channel}, Controller: ${message.controller}, Value: ${message.value}`;
        } else {
            messageContent = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> - ${JSON.stringify(message)}`;
        }
        
        messageElement.innerHTML = messageContent;
        midiMessages.appendChild(messageElement);
        midiMessages.scrollTop = midiMessages.scrollHeight;
    });
    
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
    
    // Request initial MIDI interfaces and mappings
    socket.emit('getMidiInterfaces');
    socket.emit('getMidiMappings');
    log('MIDI Atelier initialized - awaiting your artistic correspondences');
});