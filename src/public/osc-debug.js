document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    
    // DOM Elements
    const oscMessages = document.getElementById('oscMessages');
    const oscTestAddress = document.getElementById('oscTestAddress');
    const oscTestValue = document.getElementById('oscTestValue');
    const sendOscTestButton = document.getElementById('sendOscTest');
    const clearOscMessagesButton = document.getElementById('clearOscMessages');
    const themeToggle = document.getElementById('themeToggle');
    const statusMessage = document.getElementById('statusMessage');
    const artnetIndicator = document.getElementById('artnet-indicator');
    const oscInIndicator = document.getElementById('osc-in-indicator');
    const oscOutIndicator = document.getElementById('osc-out-indicator');
    const collapseToggles = document.querySelectorAll('.collapse-toggle');
    const debugOutput = document.getElementById('debugOutput');
    
    // State variables
    let darkMode = true; // Default to dark mode
    let oscInActivity = false;
    let oscOutActivity = false;
    let artnetStatus = false;
    
    // Activity timeout for OSC indicators
    const activityTimeout = 300; // 300ms
    let oscInActivityTimeout;
    let oscOutActivityTimeout;
    
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
    
    socket.on('oscMessage', (message) => {
        triggerOscInActivity();
        
        const messageElement = document.createElement('div');
        messageElement.className = 'osc-message';
        
        let messageContent = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> - <span class="message-address">${message.address}</span> - Args: ${JSON.stringify(message.args)}`;
        
        if (message.address.startsWith('/SCENE/')) {
            messageElement.classList.add('scene-message');
            messageContent += ' <span class="scene-indicator">(Scene Manifestation)</span>';
        }
        
        messageElement.innerHTML = messageContent;
        oscMessages.appendChild(messageElement);
        oscMessages.scrollTop = oscMessages.scrollHeight;
    });
    
    sendOscTestButton.addEventListener('click', () => {
        const address = oscTestAddress.value;
        const value = oscTestValue.value;
        
        if (!address) {
            showMessage('One must provide an ethereal address for the message to traverse the void', 'error');
            return;
        }
        
        if (!value) {
            showMessage('A message without value is like a canvas without pigment - please provide a value', 'error');
            return;
        }
        
        socket.emit('sendOscTest', { address, value });
        triggerOscOutActivity();
        
        const messageElement = document.createElement('div');
        messageElement.className = 'osc-message outgoing';
        messageElement.innerHTML = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> - <span class="outgoing-indicator">DISPATCHED</span> - <span class="message-address">${address}</span> - Value: ${value}`;
        
        oscMessages.appendChild(messageElement);
        oscMessages.scrollTop = oscMessages.scrollHeight;
        
        showMessage(`OSC missive dispatched into the digital ether: ${address}`, 'success');
        log(`OSC message sent: ${address} ${value}`);
    });
    
    if (clearOscMessagesButton) {
        clearOscMessagesButton.addEventListener('click', () => {
            oscMessages.innerHTML = '';
            log('Ethereal messages swept from the digital canvas');
        });
    }
    
    socket.on('oscSettings', (settings) => {
        const settingsElement = document.createElement('div');
        settingsElement.className = 'osc-message settings';
        settingsElement.innerHTML = `
            <span class="timestamp">${new Date().toLocaleTimeString()}</span> - 
            <span class="settings-indicator">CONFIGURATION</span> - 
            Input Port: <span class="settings-value">${settings.inputPort}</span>, 
            Output Port: <span class="settings-value">${settings.outputPort}</span>, 
            Output Address: <span class="settings-value">${settings.outputAddress}</span>
        `;
        
        oscMessages.appendChild(settingsElement);
        log(`OSC configured - Input Port: ${settings.inputPort}, Output Port: ${settings.outputPort}`);
    });
    
    socket.on('sceneActivated', (sceneName) => {
        const sceneElement = document.createElement('div');
        sceneElement.className = 'osc-message scene-activation';
        sceneElement.innerHTML = `
            <span class="timestamp">${new Date().toLocaleTimeString()}</span> - 
            <span class="scene-indicator">SCENE MANIFESTATION</span> - 
            "${sceneName}" has materialized on the canvas
        `;
        
        oscMessages.appendChild(sceneElement);
        oscMessages.scrollTop = oscMessages.scrollHeight;
        log(`Scene "${sceneName}" manifested through OSC`);
    });
    
    socket.on('oscSent', (data) => {
        triggerOscOutActivity();
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
    
    function triggerOscInActivity() {
        if (oscInIndicator) {
            oscInIndicator.classList.add('active');
            if (oscInActivityTimeout) clearTimeout(oscInActivityTimeout);
            oscInActivityTimeout = setTimeout(() => {
                oscInIndicator.classList.remove('active');
            }, activityTimeout);
        }
    }
    
    function triggerOscOutActivity() {
        if (oscOutIndicator) {
            oscOutIndicator.classList.add('active');
            if (oscOutActivityTimeout) clearTimeout(oscOutActivityTimeout);
            oscOutActivityTimeout = setTimeout(() => {
                oscOutIndicator.classList.remove('active');
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
    
    // Clear messages when the page loads
    oscMessages.innerHTML = '';
    
    // Request any stored OSC messages and settings
    socket.emit('getStoredOscMessages');
    socket.emit('getOscSettings');
    
    log('OSC Critique initialized - the network whispers await');
});