document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.io connection
    const socket = io();

    // DOM Elements - Status indicators
    const artnetIndicator = document.getElementById('artnet-indicator');
    const midiInIndicator = document.getElementById('midi-in-indicator');
    const midiOutIndicator = document.getElementById('midi-out-indicator');
    const oscInIndicator = document.getElementById('osc-in-indicator');
    const oscOutIndicator = document.getElementById('osc-out-indicator');
    
    // DOM Elements - Main UI
    const statusMessage = document.getElementById('statusMessage');
    const themeToggle = document.getElementById('themeToggle');
    
    // DOM Elements - Navigation
    const navButtons = document.querySelectorAll('nav button');
    const navMain = document.getElementById('navMain');
    const navMidiOsc = document.getElementById('navMidiOsc');
    const navFixture = document.getElementById('navFixture');
    const navScenes = document.getElementById('navScenes');
    const navOscDebug = document.getElementById('navOscDebug');
    const navMisc = document.getElementById('navMisc');
    
    // DOM Elements - Section containers
    const mainControl = document.getElementById('mainControl');
    const midiOscSetup = document.getElementById('midiOscSetup');
    const fixtureSetup = document.getElementById('fixtureSetup');
    const sceneGallery = document.getElementById('sceneGallery');
    const oscDebug = document.getElementById('oscDebug');
    const misc = document.getElementById('misc');
    
    // DOM Elements - Scene management
    const sceneName = document.getElementById('sceneName');
    const sceneOscAddress = document.getElementById('sceneOscAddress');
    const saveSceneBtn = document.getElementById('saveScene');
    const clearAllScenesBtn = document.getElementById('clearAllScenes');
    const loadSceneSelect = document.getElementById('loadSceneSelect');
    const loadSceneButton = document.getElementById('loadSceneButton');
    const savedScenesList = document.getElementById('savedScenesList');
    const sceneGalleryList = document.getElementById('sceneGalleryList');
    
    // DOM Elements - Transition controls
    const transitionDuration = document.getElementById('transitionDuration');
    const transitionDurationValue = document.getElementById('transitionDurationValue');
    const sceneTransitionFrom = document.getElementById('sceneTransitionFrom');
    const sceneTransitionTo = document.getElementById('sceneTransitionTo');
    const transitionSlider = document.getElementById('transitionSlider');
    const transitionSliderValue = document.getElementById('transitionSliderValue');
    
    // DOM Elements - Auto Pilot
    const autoPilotSceneFrom = document.getElementById('autoPilotSceneFrom');
    const autoPilotSceneTo = document.getElementById('autoPilotSceneTo');
    const autoPilotToggle = document.getElementById('autoPilotToggle');
    const autoPilotSlider = document.getElementById('autoPilotSlider');
    const autoPilotSliderValue = document.getElementById('autoPilotSliderValue');
    const autoPilotDurationDisplay = document.getElementById('autoPilotDurationDisplay');
    
    // DOM Elements - BPM
    const tapButton = document.getElementById('tapButton');
    const bpmDisplay = document.getElementById('bpmDisplay');
    const syncLightsButton = document.getElementById('syncLightsButton');
    
    // DOM Elements - Color Picker
    const colorPalette = document.getElementById('colorPalette');
    const colorPickerModal = document.getElementById('colorPickerModal');
    const closeModal = document.querySelector('.close-modal');
    const redSlider = document.getElementById('redSlider');
    const greenSlider = document.getElementById('greenSlider');
    const blueSlider = document.getElementById('blueSlider');
    const redValue = document.getElementById('redValue');
    const greenValue = document.getElementById('greenValue');
    const blueValue = document.getElementById('blueValue');
    const colorPreview = document.getElementById('colorPreview');
    const saveCustomColor = document.getElementById('saveCustomColor');
    
    // DOM Elements - Channel controls
    const dmxChannelsContainer = document.getElementById('dmxChannels');
    const groupControlsContainer = document.getElementById('groupControls');
    
    // DOM Elements - Collapse toggles
    const collapseToggles = document.querySelectorAll('.collapse-toggle');
    
    // DOM Elements - Logging
    const debugOutput = document.getElementById('debugOutput');
    
    // State variables
    let dmxChannels = new Array(512).fill(0);
    let oscAssignments = new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`);
    let channelNames = new Array(512).fill('').map((_, i) => `Channel ${i + 1}`);
    let fixtures = [];
    let groups = [];
    let scenes = [];
    let midiMappings = {};
    let currentMidiLearnChannel = null;
    let currentMidiLearnScene = null;
    let midiLearnTimeout = null;
    let sceneTransition = { fromScene: null, toScene: null, progress: 0 };
    let autoPilot = { fromScene: null, toScene: null, active: false, progress: 0, duration: 60000 };
    let autoPilotInterval = null;
    let channelColors = {};
    let tapTimes = [];
    let currentBPM = 0;
    let darkMode = true; // Default to dark mode
    const stateTitles = [
        'Void',
        'Embryonic state',
        'Whisper of awareness',
        'Nascent form',
        'Awakening',
        'Emergent consciousness',
        'Half-realized vision',
        'Manifestation in progress',
        'Approaching clarity',
        'Imminent revelation',
        'Complete expression'
    ];

    // Events on status indicators
    let artnetStatus = false;
    let midiInActivity = false;
    let midiOutActivity = false;
    let oscInActivity = false;
    let oscOutActivity = false;
    
    // Activity timeout for MIDI/OSC indicators
    const activityTimeout = 300; // 300ms
    let midiInActivityTimeout;
    let midiOutActivityTimeout;
    let oscInActivityTimeout;
    let oscOutActivityTimeout;

    // Initialize draggable elements
    const draggableContainers = document.querySelectorAll('.draggable');
    draggableContainers.forEach(container => {
        const cardHeader = container;
        const card = container.closest('.card');
        
        cardHeader.addEventListener('mousedown', () => {
            card.classList.add('dragging');
        });
        
        document.addEventListener('mouseup', () => {
            card.classList.remove('dragging');
        });
        
        cardHeader.addEventListener('mousemove', (e) => {
            if (card.classList.contains('dragging')) {
                const rect = card.getBoundingClientRect();
                card.style.position = 'absolute';
                card.style.zIndex = 1000;
                card.style.top = e.clientY - rect.height / 2 + 'px';
                card.style.left = e.clientX - rect.width / 2 + 'px';
            }
        });
    });
    
    // Collapse/expand functionality
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

    // Socket Event Listeners
    socket.on('connect', () => {
        updateArtnetStatus(true);
        showMessage('Connected to the luminous server', 'success');
    });

    socket.on('disconnect', () => {
        updateArtnetStatus(false);
        showMessage('Connection to the server lost - the canvas grows dark', 'error');
    });

    socket.on('initialState', (data) => {
        dmxChannels = data.dmxChannels;
        oscAssignments = data.oscAssignments;
        channelNames = data.channelNames;
        fixtures = data.fixtures;
        groups = data.groups;
        midiMappings = data.midiMappings;
        scenes = data.scenes;

        renderDmxChannels();
        renderFixtures();
        renderGroups();
        updateSceneSelects();
        renderSceneGallery();
        log('Initial state received and rendered on the canvas');
    });

    socket.on('dmxUpdate', ({ channel, value }) => {
        dmxChannels[channel] = value;
        updateDmxSlider(channel, value);
    });

    socket.on('sceneSaved', (name) => {
        showMessage(`Scene "${name}" immortalized in the gallery`, 'success');
        socket.emit('getSceneList');
    });

    socket.on('sceneList', (sceneList) => {
        scenes = sceneList;
        updateSceneSelects();
        renderSceneGallery();
    });

    socket.on('sceneLoaded', ({ name, channelValues }) => {
        showMessage(`Scene "${name}" materialized on the canvas`, 'success');
        dmxChannels = [...channelValues];
        renderDmxChannels();
    });

    socket.on('sceneLoadError', ({ name, error }) => {
        showMessage(`Failed to materialize scene "${name}": ${error}`, 'error');
    });

    socket.on('midiInterfaces', (interfaces) => {
        const interfaceSelect = document.getElementById('midiInterfaceSelect');
        if (interfaceSelect) {
            interfaceSelect.innerHTML = `
                <h4>Available MIDI Muses</h4>
                <ul class="midi-interfaces-list">
                    ${interfaces.map(name => `<li>${name}</li>`).join('')}
                </ul>
            `;
        }
    });

    socket.on('midiMessage', (message) => {
        // Show MIDI In activity
        triggerMidiInActivity();
        
        const midiMessages = document.getElementById('midiMessages');
        if (midiMessages) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('midi-message');
            messageElement.innerHTML = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> - ${formatMidiMessage(message)}`;
            midiMessages.appendChild(messageElement);
            midiMessages.scrollTop = midiMessages.scrollHeight;
        }
    });

    socket.on('oscMessage', (message) => {
        // Show OSC In activity
        triggerOscInActivity();
        
        const oscMessages = document.getElementById('oscMessages');
        if (oscMessages) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('osc-message');
            messageElement.innerHTML = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> - ${formatOscMessage(message)}`;
            oscMessages.appendChild(messageElement);
            oscMessages.scrollTop = oscMessages.scrollHeight;
        }
    });

    socket.on('midiMappingLearned', ({ channel, mapping }) => {
        if (currentMidiLearnChannel !== null) {
            const learnButton = document.querySelector(`.midi-learn[data-channel="${currentMidiLearnChannel}"]`);
            if (learnButton) {
                learnButton.classList.remove('learning');
                learnButton.classList.add('mapped');
                learnButton.textContent = 'Mapped';
            }
            showMessage(`Channel ${currentMidiLearnChannel} has been mapped to MIDI ${mapping.channel}:${mapping.note || mapping.controller}`, 'success');
            currentMidiLearnChannel = null;
        } else if (currentMidiLearnScene !== null) {
            showMessage(`Scene "${currentMidiLearnScene}" has been mapped to MIDI ${mapping.channel}:${mapping.note || mapping.controller}`, 'success');
            currentMidiLearnScene = null;
        }
    });

    socket.on('artnetStatus', ({ ip, status }) => {
        updateArtnetStatus(status === 'alive');
        
        const artnetStatus = document.getElementById('artnetStatus');
        if (artnetStatus) {
            artnetStatus.innerHTML = `<p>ArtNet device at ${ip} is <span class="${status === 'alive' ? 'status-alive' : 'status-dead'}">${status === 'alive' ? 'connected' : 'unreachable'}</span></p>`;
        }
    });

    socket.on('artnetDevices', (devices) => {
        const artnetDevices = document.getElementById('artnetDevices');
        if (artnetDevices) {
            artnetDevices.innerHTML = `
                <div class="device-list">
                    ${devices.length ? devices.map(device => `
                        <div class="device-item card">
                            <div class="card-header">
                                <h4>${device.name || 'Unnamed Device'}</h4>
                            </div>
                            <div class="card-body">
                                <p>IP: ${device.ip}</p>
                                <p>MAC: ${device.mac}</p>
                            </div>
                            <div class="card-footer">
                                <button class="connect-device" data-ip="${device.ip}">Connect to this entity</button>
                            </div>
                        </div>
                    `).join('') : '<p>No ArtNet devices were found in the ether</p>'}
                </div>
            `;
            
            // Add event listeners to connect buttons
            document.querySelectorAll('.connect-device').forEach(button => {
                button.addEventListener('click', () => {
                    const ip = button.dataset.ip;
                    document.getElementById('artnetIp').value = ip;
                    showMessage(`ArtNet IP set to ${ip}. Don't forget to save the configuration.`, 'success');
                });
            });
        }
    });

    socket.on('oscSent', (data) => {
        // Show OSC Out activity
        triggerOscOutActivity();
    });

    socket.on('midiSent', (data) => {
        // Show MIDI Out activity
        triggerMidiOutActivity();
    });

    // Navigation Event Listeners
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    navMain.addEventListener('click', () => showSection(mainControl));
    navMidiOsc.addEventListener('click', () => showSection(midiOscSetup));
    navFixture.addEventListener('click', () => showSection(fixtureSetup));
    navScenes.addEventListener('click', () => showSection(sceneGallery));
    navOscDebug.addEventListener('click', () => showSection(oscDebug));
    navMisc.addEventListener('click', () => showSection(misc));

    // Theme functionality
    themeToggle.addEventListener('click', toggleTheme);
    
    // UI Theme Selection
    const uiThemeSelect = document.getElementById('uiThemeSelect');
    if (uiThemeSelect) {
        uiThemeSelect.addEventListener('change', (e) => {
            changeUITheme(e.target.value);
        });
    }
    
    // Quick Group functionality
    const createQuickGroupBtn = document.getElementById('createQuickGroup');
    const selectAllChannelsBtn = document.getElementById('selectAllChannels');
    const deselectAllChannelsBtn = document.getElementById('deselectAllChannels');
    const invertChannelSelectionBtn = document.getElementById('invertChannelSelection');
    const popoutChannelsBtn = document.getElementById('popoutChannels');
    
    if (createQuickGroupBtn) {
        createQuickGroupBtn.addEventListener('click', createQuickGroup);
    }
    
    if (selectAllChannelsBtn) {
        selectAllChannelsBtn.addEventListener('click', selectAllChannels);
    }
    
    if (deselectAllChannelsBtn) {
        deselectAllChannelsBtn.addEventListener('click', deselectAllChannels);
    }
    
    if (invertChannelSelectionBtn) {
        invertChannelSelectionBtn.addEventListener('click', invertChannelSelection);
    }
    
    if (popoutChannelsBtn) {
        popoutChannelsBtn.addEventListener('click', popoutSelectedChannels);
    }

    // Scene Management
    saveSceneBtn.addEventListener('click', saveScene);
    clearAllScenesBtn.addEventListener('click', clearAllScenes);
    loadSceneButton.addEventListener('click', loadSelectedScene);

    // Transition Controls
    transitionDuration.addEventListener('input', updateTransitionDuration);
    transitionSlider.addEventListener('input', updateTransition);
    sceneTransitionFrom.addEventListener('change', updateTransitionScenes);
    sceneTransitionTo.addEventListener('change', updateTransitionScenes);

    // Auto Pilot
    autoPilotToggle.addEventListener('change', toggleAutoPilot);
    autoPilotSceneFrom.addEventListener('change', updateAutoPilotScenes);
    autoPilotSceneTo.addEventListener('change', updateAutoPilotScenes);

    // BPM Counter
    tapButton.addEventListener('click', tapTempo);
    syncLightsButton.addEventListener('click', syncLightsToBPM);

    // Color Palette
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            if (preset.classList.contains('custom-color')) {
                openColorPicker();
            } else {
                applyColorToSelectedChannels(preset.dataset.color);
            }
        });
    });

    // Color Picker Modal
    closeModal.addEventListener('click', () => {
        colorPickerModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === colorPickerModal) {
            colorPickerModal.style.display = 'none';
        }
    });

    redSlider.addEventListener('input', updateColorPreview);
    greenSlider.addEventListener('input', updateColorPreview);
    blueSlider.addEventListener('input', updateColorPreview);
    saveCustomColor.addEventListener('click', saveAndApplyCustomColor);

    // OSC Debug functions
    if (document.getElementById('clearOscMessages')) {
        document.getElementById('clearOscMessages').addEventListener('click', () => {
            const oscMessages = document.getElementById('oscMessages');
            if (oscMessages) {
                oscMessages.innerHTML = '';
            }
        });
    }

    if (document.getElementById('sendOscTest')) {
        document.getElementById('sendOscTest').addEventListener('click', () => {
            const address = document.getElementById('oscTestAddress').value;
            const value = document.getElementById('oscTestValue').value;
            
            if (address) {
                socket.emit('sendOscMessage', { address, value });
                triggerOscOutActivity();
                showMessage(`OSC message sent: ${address} ${value}`, 'success');
            } else {
                showMessage('Please provide an OSC address', 'error');
            }
        });
    }

    // ArtNet configuration
    if (document.getElementById('saveArtnetConfig')) {
        document.getElementById('saveArtnetConfig').addEventListener('click', () => {
            const ip = document.getElementById('artnetIp').value;
            const subnet = parseInt(document.getElementById('artnetSubnet').value) || 0;
            const universe = parseInt(document.getElementById('artnetUniverse').value) || 0;
            const net = parseInt(document.getElementById('artnetNet').value) || 0;
            
            socket.emit('updateArtnetConfig', { ip, subnet, universe, net });
            showMessage('ArtNet configuration committed to memory', 'success');
        });
    }

    if (document.getElementById('searchArtnetDevices')) {
        document.getElementById('searchArtnetDevices').addEventListener('click', () => {
            socket.emit('searchArtnetDevices');
            showMessage('Searching for ArtNet entities in the network...', 'info');
        });
    }

    // Settings management
    if (document.getElementById('saveAllSettings')) {
        document.getElementById('saveAllSettings').addEventListener('click', () => {
            socket.emit('saveAllSettings');
            showMessage('All settings archived for posterity', 'success');
        });
    }

    if (document.getElementById('loadAllSettings')) {
        document.getElementById('loadAllSettings').addEventListener('click', () => {
            socket.emit('loadAllSettings');
            showMessage('Settings resurrected from the archives', 'success');
        });
    }

    if (document.getElementById('nukeSettings')) {
        document.getElementById('nukeSettings').addEventListener('click', () => {
            if (confirm('Are you absolutely certain you wish to obliterate ALL settings? This act of artistic destruction cannot be undone.')) {
                socket.emit('nukeSettings');
                showMessage('All settings have been obliterated', 'success');
            }
        });
    }

    // Logging preferences
    if (document.getElementById('enableLogging')) {
        document.getElementById('enableLogging').addEventListener('change', (e) => {
            socket.emit('setLoggingEnabled', { enabled: e.target.checked });
        });
    }

    if (document.getElementById('enableConsoleLogging')) {
        document.getElementById('enableConsoleLogging').addEventListener('change', (e) => {
            socket.emit('setConsoleLoggingEnabled', { enabled: e.target.checked });
        });
    }
    
    // Theme Settings in the Settings Page
    if (document.getElementById('settingsThemeSelect')) {
        const settingsThemeSelect = document.getElementById('settingsThemeSelect');
        
        // Update the settings theme dropdown to match the currently active theme
        function updateSettingsThemeDropdown() {
            const currentTheme = Array.from(document.body.classList).find(cls => 
                ['artsnob', 'standard', 'minimal'].includes(cls)) || 'artsnob';
            
            settingsThemeSelect.value = currentTheme;
        }
        
        // Initialize the dropdown with the current theme
        updateSettingsThemeDropdown();
        
        // Handle theme changes from settings page
        settingsThemeSelect.addEventListener('change', (e) => {
            changeUITheme(e.target.value);
            
            // Also update the main theme selector in the toolbar to stay in sync
            const mainThemeSelector = document.getElementById('uiThemeSelect');
            if (mainThemeSelector) {
                mainThemeSelector.value = e.target.value;
            }
        });
    }
    
    // Theme mode toggle in settings
    if (document.getElementById('settingsThemeToggle')) {
        const settingsThemeToggle = document.getElementById('settingsThemeToggle');
        const settingsThemeMode = document.getElementById('settingsThemeMode');
        
        // Initialize theme mode checkbox
        const themeMode = document.documentElement.getAttribute('data-theme') || 'dark';
        settingsThemeMode.checked = themeMode === 'light';
        
        // Update icon
        settingsThemeToggle.innerHTML = settingsThemeMode.checked ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        // Handle theme mode toggle click
        settingsThemeToggle.addEventListener('click', () => {
            toggleTheme();
            
            // Update the checkbox state after toggle
            const newThemeMode = document.documentElement.getAttribute('data-theme') || 'dark';
            settingsThemeMode.checked = newThemeMode === 'light';
            
            // Update icon
            settingsThemeToggle.innerHTML = settingsThemeMode.checked ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
        
        // Handle checkbox change
        settingsThemeMode.addEventListener('change', () => {
            // Only toggle if the current state doesn't match the checkbox
            const currentThemeMode = document.documentElement.getAttribute('data-theme') || 'dark';
            const desiredMode = settingsThemeMode.checked ? 'light' : 'dark';
            
            if (currentThemeMode !== desiredMode) {
                toggleTheme();
            }
            
            // Update icon
            settingsThemeToggle.innerHTML = settingsThemeMode.checked ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }

    // Functions for UI management
    function showSection(section) {
        mainControl.style.display = 'none';
        midiOscSetup.style.display = 'none';
        fixtureSetup.style.display = 'none';
        sceneGallery.style.display = 'none';
        oscDebug.style.display = 'none';
        misc.style.display = 'none';

        section.style.display = 'block';
        log(`Navigated to ${getSectionName(section)}`);
    }

    function getSectionName(section) {
        if (section === mainControl) return 'Luminous Canvas';
        if (section === midiOscSetup) return 'MIDI/OSC Atelier';
        if (section === fixtureSetup) return 'Fixture Composition';
        if (section === sceneGallery) return 'Scene Gallery';
        if (section === oscDebug) return 'OSC Critique';
        if (section === misc) return 'Avant-Garde Settings';
        return 'Unknown Section';
    }

    function toggleTheme() {
        darkMode = !darkMode;
        const themeMode = darkMode ? 'dark' : 'light';
        
        // Set the data-theme attribute on both html and body (for CSS selectors)
        document.documentElement.setAttribute('data-theme', themeMode);
        document.body.setAttribute('data-theme', themeMode);
        
        // Update the main theme toggle button
        if (themeToggle) {
            themeToggle.innerHTML = darkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
        
        // Update the settings theme toggle if it exists
        const settingsThemeToggle = document.getElementById('settingsThemeToggle');
        if (settingsThemeToggle) {
            settingsThemeToggle.innerHTML = darkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
        
        // Update the settings theme checkbox if it exists
        const settingsThemeMode = document.getElementById('settingsThemeMode');
        if (settingsThemeMode) {
            settingsThemeMode.checked = !darkMode; // Light mode = checked
        }
        
        // Get current theme style
        const currentTheme = Array.from(document.body.classList).find(cls => 
            ['artsnob', 'standard', 'minimal'].includes(cls)) || 'artsnob';
        
        // Save to local storage
        localStorage.setItem('dmxThemeMode', themeMode);
        
        const themeDescriptions = {
            'artsnob': {
                'dark': 'darkened nocturnal palette',
                'light': 'enlightened diurnal aesthetic'
            },
            'standard': {
                'dark': 'dark mode',
                'light': 'light mode'
            },
            'minimal': {
                'dark': 'dark',
                'light': 'light'
            }
        };
        
        // Force refresh each theme stylesheet to ensure it applies the new theme mode
        const themeStylesheet = document.getElementById('themeStylesheet');
        if (themeStylesheet) {
            // Force a reload by adding a cache-busting parameter
            const currentSrc = themeStylesheet.getAttribute('href').split('?')[0];
            themeStylesheet.href = `${currentSrc}?t=${Date.now()}`;
        }
        
        // Apply the current theme again to ensure proper application of theme + mode
        changeUITheme(currentTheme, true);
        
        // Allow for CSS transitions to complete
        setTimeout(() => {
            // Get theme-specific descriptions
            const description = themeDescriptions[currentTheme][themeMode] || `${themeMode} mode`;
            showMessage(`Theme transformed to ${description}`, 'success');
            log(`Theme changed to ${description} - the canvas shifts its tonal balance`);
        }, 50);
    }

    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        statusMessage.style.display = 'block';

        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }

    function formatMidiMessage(message) {
        if (message._type === 'noteon' || message._type === 'noteoff') {
            return `<span class="message-type">${message._type}</span> - Channel: ${message.channel}, Note: ${message.note}, Velocity: ${message.velocity}`;
        } else if (message._type === 'cc') {
            return `<span class="message-type">${message._type}</span> - Channel: ${message.channel}, Controller: ${message.controller}, Value: ${message.value}`;
        }
        return JSON.stringify(message);
    }

    function formatOscMessage(message) {
        return `<span class="message-address">${message.address}</span> - Args: ${JSON.stringify(message.args)}`;
    }

    // Status indicator functions
    function updateArtnetStatus(isConnected) {
        artnetStatus = isConnected;
        if (isConnected) {
            artnetIndicator.classList.add('connected');
        } else {
            artnetIndicator.classList.remove('connected');
        }
    }
    
    function triggerMidiInActivity() {
        midiInIndicator.classList.add('active');
        if (midiInActivityTimeout) clearTimeout(midiInActivityTimeout);
        midiInActivityTimeout = setTimeout(() => {
            midiInIndicator.classList.remove('active');
        }, activityTimeout);
    }
    
    function triggerMidiOutActivity() {
        midiOutIndicator.classList.add('active');
        if (midiOutActivityTimeout) clearTimeout(midiOutActivityTimeout);
        midiOutActivityTimeout = setTimeout(() => {
            midiOutIndicator.classList.remove('active');
        }, activityTimeout);
    }
    
    function triggerOscInActivity() {
        oscInIndicator.classList.add('active');
        if (oscInActivityTimeout) clearTimeout(oscInActivityTimeout);
        oscInActivityTimeout = setTimeout(() => {
            oscInIndicator.classList.remove('active');
        }, activityTimeout);
    }
    
    function triggerOscOutActivity() {
        oscOutIndicator.classList.add('active');
        if (oscOutActivityTimeout) clearTimeout(oscOutActivityTimeout);
        oscOutActivityTimeout = setTimeout(() => {
            oscOutIndicator.classList.remove('active');
        }, activityTimeout);
    }

    // DMX Channel Management
    function renderDmxChannels() {
        dmxChannelsContainer.innerHTML = '';
        
        // Create channel groups of 4 for better organization
        for (let i = 0; i < dmxChannels.length; i += 4) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'channel-group';
            
            for (let j = i; j < i + 4 && j < dmxChannels.length; j++) {
                const channelDiv = document.createElement('div');
                channelDiv.className = 'dmx-channel card';
                channelDiv.dataset.channel = j;
                
                // Check if this channel is mapped to a color
                if (channelColors[j]) {
                    channelDiv.style.borderLeft = `3px solid rgb(${channelColors[j]})`;
                }
                
                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header';
                
                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                
                // Create the channel title with the checkbox
                const titleContainer = document.createElement('div');
                titleContainer.className = 'channel-title-container';
                
                // Add checkbox for channel selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'channel-select';
                checkbox.dataset.channel = j;
                checkbox.id = `channel-select-${j}`;
                
                const channelTitle = document.createElement('h3');
                
                // Create a label for the checkbox that wraps the title
                const checkboxLabel = document.createElement('label');
                checkboxLabel.className = 'channel-title-label';
                checkboxLabel.htmlFor = `channel-select-${j}`;
                checkboxLabel.innerHTML = `${j + 1}: <small class="art-subtitle">${channelNames[j]}</small>`;
                
                // Prepend checkbox to title
                titleContainer.appendChild(checkbox);
                titleContainer.appendChild(checkboxLabel);
                
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.value = channelNames[j];
                nameInput.className = 'channel-name';
                nameInput.dataset.channel = j;
                nameInput.addEventListener('change', (e) => {
                    channelNames[j] = e.target.value;
                    socket.emit('updateChannelName', { channel: j, name: e.target.value });
                    // Update the title display
                    checkboxLabel.innerHTML = `${j + 1}: <small class="art-subtitle">${e.target.value}</small>`;
                });
                
                const collapseToggle = document.createElement('button');
                collapseToggle.className = 'collapse-toggle';
                collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
                collapseToggle.addEventListener('click', () => {
                    if (cardBody.style.display === 'none') {
                        cardBody.style.display = 'block';
                        collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    } else {
                        cardBody.style.display = 'none';
                        collapseToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    }
                });
                
                const channelControls = document.createElement('div');
                channelControls.className = 'channel-controls';
                
                // Add mini buttons for individual channel actions
                const channelActionsDiv = document.createElement('div');
                channelActionsDiv.className = 'channel-actions';
                
                const popoutButton = document.createElement('button');
                popoutButton.className = 'channel-action-button';
                popoutButton.innerHTML = '<i class="fas fa-external-link-alt"></i>';
                popoutButton.title = 'Pop out this channel';
                popoutButton.addEventListener('click', () => {
                    popoutGroup(`channel-${j}`, `Channel ${j+1}: ${channelNames[j]}`, [j]);
                });
                
                const quickGroupButton = document.createElement('button');
                quickGroupButton.className = 'channel-action-button';
                quickGroupButton.innerHTML = '<i class="fas fa-plus-circle"></i>';
                quickGroupButton.title = 'Add to a quick group';
                quickGroupButton.addEventListener('click', () => {
                    // Select this channel
                    checkbox.checked = true;
                    createQuickGroup();
                });
                
                channelActionsDiv.appendChild(popoutButton);
                channelActionsDiv.appendChild(quickGroupButton);
                
                // Add channel edit name label and button
                const editNameButton = document.createElement('button');
                editNameButton.className = 'channel-action-button';
                editNameButton.innerHTML = '<i class="fas fa-edit"></i>';
                editNameButton.title = 'Edit channel name';
                editNameButton.addEventListener('click', () => {
                    // Toggle name input visibility
                    if (nameInput.style.display === 'none' || !nameInput.style.display) {
                        nameInput.style.display = 'block';
                        nameInput.focus();
                    } else {
                        nameInput.style.display = 'none';
                    }
                });
                
                channelActionsDiv.appendChild(editNameButton);
                
                // Hide name input by default
                nameInput.style.display = 'none';
                
                // Channel slider control
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = 0;
                slider.max = 255;
                slider.value = dmxChannels[j];
                slider.className = 'dmx-slider';
                slider.dataset.channel = j;
                slider.addEventListener('input', (e) => updateChannel(j, parseInt(e.target.value)));
                
                const valueDisplay = document.createElement('span');
                valueDisplay.className = 'channel-value';
                valueDisplay.textContent = dmxChannels[j];
                
                // OSC Assignment
                const oscDiv = document.createElement('div');
                oscDiv.className = 'osc-assignment';
                
                const oscLabel = document.createElement('label');
                oscLabel.textContent = 'OSC Address:';
                
                const oscInput = document.createElement('input');
                oscInput.type = 'text';
                oscInput.value = oscAssignments[j];
                oscInput.className = 'osc-value';
                oscInput.dataset.channel = j;
                oscInput.addEventListener('change', (e) => {
                    oscAssignments[j] = e.target.value;
                    socket.emit('updateOscAssignment', { channel: j, address: e.target.value });
                });
                
                oscDiv.appendChild(oscLabel);
                oscDiv.appendChild(oscInput);
                
                // MIDI Learn button
                const midiLearnBtn = document.createElement('button');
                midiLearnBtn.className = 'midi-learn';
                midiLearnBtn.innerHTML = midiMappings[j] ? '<i class="fas fa-music"></i> Mapped' : '<i class="fas fa-music"></i> MIDI Learn';
                midiLearnBtn.dataset.channel = j;
                if (midiMappings[j]) {
                    midiLearnBtn.classList.add('mapped');
                }
                midiLearnBtn.addEventListener('click', () => startMidiLearn(j));
                
                // Assemble the card header with the new title container
                cardHeader.appendChild(titleContainer);
                cardHeader.appendChild(collapseToggle);
                
                // Assemble the card body
                cardBody.appendChild(channelActionsDiv);
                cardBody.appendChild(nameInput);
                cardBody.appendChild(slider);
                cardBody.appendChild(valueDisplay);
                cardBody.appendChild(document.createElement('hr'));
                cardBody.appendChild(oscDiv);
                cardBody.appendChild(midiLearnBtn);
                
                channelDiv.appendChild(cardHeader);
                channelDiv.appendChild(cardBody);
                
                groupDiv.appendChild(channelDiv);
            }
            
            dmxChannelsContainer.appendChild(groupDiv);
        }
        
        log('DMX channels rendered on the canvas');
    }

    function renderFixtures() {
        const fixturesList = document.getElementById('fixturesList');
        if (!fixturesList) return;
        
        fixturesList.innerHTML = '';
        
        fixtures.forEach((fixture, index) => {
            const fixtureDiv = document.createElement('div');
            fixtureDiv.className = 'fixture-item card';
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const fixtureHeader = document.createElement('h3');
            fixtureHeader.textContent = fixture.name;
            
            const collapseToggle = document.createElement('button');
            collapseToggle.className = 'collapse-toggle';
            collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
            collapseToggle.addEventListener('click', () => {
                const cardBody = fixtureDiv.querySelector('.card-body');
                const cardFooter = fixtureDiv.querySelector('.card-footer');
                
                if (cardBody.style.display === 'none') {
                    cardBody.style.display = 'block';
                    if (cardFooter) cardFooter.style.display = 'flex';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
                } else {
                    cardBody.style.display = 'none';
                    if (cardFooter) cardFooter.style.display = 'none';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
                }
            });
            
            cardHeader.appendChild(fixtureHeader);
            cardHeader.appendChild(collapseToggle);
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            const fixtureAddress = document.createElement('p');
            fixtureAddress.textContent = `Starting Address: ${fixture.startAddress}`;
            cardBody.appendChild(fixtureAddress);
            
            const fixtureChannels = document.createElement('div');
            fixtureChannels.className = 'fixture-channels';
            fixtureChannels.innerHTML = '<h4>Channels:</h4>';
            
            fixture.channels.forEach((channel, channelIndex) => {
                const channelDiv = document.createElement('div');
                channelDiv.className = 'fixture-channel';
                
                const channelLabel = document.createElement('label');
                channelLabel.textContent = `${channel.name} (${channel.type})`;
                
                const dmxAddress = fixture.startAddress + channelIndex;
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = 0;
                slider.max = 255;
                slider.value = dmxChannels[dmxAddress - 1];
                slider.className = 'fixture-slider';
                slider.dataset.channel = dmxAddress - 1;
                slider.addEventListener('input', (e) => updateChannel(dmxAddress - 1, parseInt(e.target.value)));
                
                const valueDisplay = document.createElement('span');
                valueDisplay.className = 'channel-value';
                valueDisplay.textContent = dmxChannels[dmxAddress - 1];
                
                channelDiv.appendChild(channelLabel);
                channelDiv.appendChild(slider);
                channelDiv.appendChild(valueDisplay);
                
                fixtureChannels.appendChild(channelDiv);
            });
            
            cardBody.appendChild(fixtureChannels);
            
            const cardFooter = document.createElement('div');
            cardFooter.className = 'card-footer';
            
            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editButton.addEventListener('click', () => editFixture(index));
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'danger-button';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
            deleteButton.addEventListener('click', () => deleteFixture(index));
            
            cardFooter.appendChild(editButton);
            cardFooter.appendChild(deleteButton);
            
            fixtureDiv.appendChild(cardHeader);
            fixtureDiv.appendChild(cardBody);
            fixtureDiv.appendChild(cardFooter);
            
            fixturesList.appendChild(fixtureDiv);
        });
        
        // Update available fixtures for group creation
        const availableFixtures = document.getElementById('availableFixtures');
        if (availableFixtures) {
            availableFixtures.innerHTML = '';
            
            fixtures.forEach((fixture, index) => {
                const fixtureCheckbox = document.createElement('div');
                fixtureCheckbox.className = 'fixture-checkbox';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `fixture-${index}`;
                checkbox.value = index;
                
                const label = document.createElement('label');
                label.htmlFor = `fixture-${index}`;
                label.textContent = fixture.name;
                
                fixtureCheckbox.appendChild(checkbox);
                fixtureCheckbox.appendChild(label);
                
                availableFixtures.appendChild(fixtureCheckbox);
            });
        }
        
        log('Fixtures rendered in the composition panel');
    }

    function renderGroups() {
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) return;
        
        groupsList.innerHTML = '';
        
        groups.forEach((group, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-item card';
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const groupHeader = document.createElement('h3');
            groupHeader.textContent = group.name;
            
            const collapseToggle = document.createElement('button');
            collapseToggle.className = 'collapse-toggle';
            collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
            collapseToggle.addEventListener('click', () => {
                const cardBody = groupDiv.querySelector('.card-body');
                const cardFooter = groupDiv.querySelector('.card-footer');
                
                if (cardBody.style.display === 'none') {
                    cardBody.style.display = 'block';
                    if (cardFooter) cardFooter.style.display = 'flex';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
                } else {
                    cardBody.style.display = 'none';
                    if (cardFooter) cardFooter.style.display = 'none';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
                }
            });
            
            cardHeader.appendChild(groupHeader);
            cardHeader.appendChild(collapseToggle);
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            const fixturesList = document.createElement('p');
            fixturesList.textContent = `Fixtures: ${group.fixtureIndices.map(idx => fixtures[idx]?.name || 'Unknown').join(', ')}`;
            cardBody.appendChild(fixturesList);
            
            const cardFooter = document.createElement('div');
            cardFooter.className = 'card-footer';
            
            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
            editButton.addEventListener('click', () => editGroup(index));
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'danger-button';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
            deleteButton.addEventListener('click', () => deleteGroup(index));
            
            cardFooter.appendChild(editButton);
            cardFooter.appendChild(deleteButton);
            
            groupDiv.appendChild(cardHeader);
            groupDiv.appendChild(cardBody);
            groupDiv.appendChild(cardFooter);
            
            groupsList.appendChild(groupDiv);
        });
        
        // Create group controls for the main panel
        groupControlsContainer.innerHTML = '';
        
        groups.forEach((group, index) => {
            const groupFixtures = group.fixtureIndices.map(idx => fixtures[idx]);
            
            // Group common channel types (e.g., all "dimmer" channels)
            const channelsByType = {};
            
            groupFixtures.forEach(fixture => {
                if (!fixture) return;
                
                fixture.channels.forEach((channel, channelIndex) => {
                    if (!channelsByType[channel.type]) {
                        channelsByType[channel.type] = [];
                    }
                    
                    channelsByType[channel.type].push({
                        name: `${fixture.name} - ${channel.name}`,
                        dmxAddress: fixture.startAddress + channelIndex - 1
                    });
                });
            });
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-control card';
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const groupHeader = document.createElement('h3');
            groupHeader.textContent = group.name;
            
            const collapseToggle = document.createElement('button');
            collapseToggle.className = 'collapse-toggle';
            collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
            collapseToggle.addEventListener('click', () => {
                const cardBody = groupDiv.querySelector('.card-body');
                
                if (cardBody.style.display === 'none') {
                    cardBody.style.display = 'block';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
                } else {
                    cardBody.style.display = 'none';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
                }
            });
            
            cardHeader.appendChild(groupHeader);
            cardHeader.appendChild(collapseToggle);
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            // Create sliders for each channel type
            Object.entries(channelsByType).forEach(([type, channels]) => {
                const typeDiv = document.createElement('div');
                typeDiv.className = 'group-channel';
                
                const typeLabel = document.createElement('label');
                typeLabel.textContent = `All ${type} channels`;
                typeDiv.appendChild(typeLabel);
                
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = 0;
                slider.max = 255;
                slider.className = 'group-slider';
                slider.dataset.channels = JSON.stringify(channels.map(c => c.dmxAddress));
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    const channelsToUpdate = JSON.parse(e.target.dataset.channels);
                    channelsToUpdate.forEach(ch => updateChannel(ch, value));
                });
                
                const valueDisplay = document.createElement('span');
                valueDisplay.className = 'channel-value';
                valueDisplay.textContent = '0';
                
                typeDiv.appendChild(slider);
                typeDiv.appendChild(valueDisplay);
                
                cardBody.appendChild(typeDiv);
            });
            
            groupDiv.appendChild(cardHeader);
            groupDiv.appendChild(cardBody);
            
            groupControlsContainer.appendChild(groupDiv);
        });
        
        log('Groups rendered in the composition panel');
    }

    function updateSceneSelects() {
        loadSceneSelect.innerHTML = '<option value="">Select a masterpiece to materialize...</option>';
        sceneTransitionFrom.innerHTML = '<option value="">Origin state...</option>';
        sceneTransitionTo.innerHTML = '<option value="">Destination state...</option>';
        autoPilotSceneFrom.innerHTML = '<option value="">First movement...</option>';
        autoPilotSceneTo.innerHTML = '<option value="">Final crescendo...</option>';

        scenes.forEach(scene => {
            const option1 = document.createElement('option');
            option1.value = scene.name;
            option1.textContent = scene.name;
            loadSceneSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = scene.name;
            option2.textContent = scene.name;
            sceneTransitionFrom.appendChild(option2);

            const option3 = document.createElement('option');
            option3.value = scene.name;
            option3.textContent = scene.name;
            sceneTransitionTo.appendChild(option3);

            const option4 = document.createElement('option');
            option4.value = scene.name;
            option4.textContent = scene.name;
            autoPilotSceneFrom.appendChild(option4);

            const option5 = document.createElement('option');
            option5.value = scene.name;
            option5.textContent = scene.name;
            autoPilotSceneTo.appendChild(option5);
        });

        renderSavedScenesList();
        log('Scene selects updated with the latest compositions');
    }

    function renderSavedScenesList() {
        savedScenesList.innerHTML = '';

        scenes.forEach(scene => {
            const sceneDiv = document.createElement('div');
            sceneDiv.className = 'scene-item card';
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const sceneHeader = document.createElement('h3');
            sceneHeader.textContent = scene.name;
            
            const collapseToggle = document.createElement('button');
            collapseToggle.className = 'collapse-toggle';
            collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
            collapseToggle.addEventListener('click', () => {
                const cardBody = sceneDiv.querySelector('.card-body');
                const cardFooter = sceneDiv.querySelector('.card-footer');
                
                if (cardBody.style.display === 'none') {
                    cardBody.style.display = 'block';
                    if (cardFooter) cardFooter.style.display = 'flex';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
                } else {
                    cardBody.style.display = 'none';
                    if (cardFooter) cardFooter.style.display = 'none';
                    collapseToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
                }
            });
            
            cardHeader.appendChild(sceneHeader);
            cardHeader.appendChild(collapseToggle);
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            const sceneAddress = document.createElement('p');
            sceneAddress.textContent = `OSC: ${scene.oscAddress}`;
            cardBody.appendChild(sceneAddress);
            
            const cardFooter = document.createElement('div');
            cardFooter.className = 'card-footer';

            const loadButton = document.createElement('button');
            loadButton.innerHTML = '<i class="fas fa-magic"></i> Manifest';
            loadButton.addEventListener('click', () => loadScene(scene.name));

            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i> Revise';
            editButton.addEventListener('click', () => editScene(scene));

            const deleteButton = document.createElement('button');
            deleteButton.className = 'danger-button';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Erase';
            deleteButton.addEventListener('click', () => deleteScene(scene.name));

            const midiLearnBtn = document.createElement('button');
            midiLearnBtn.className = 'midi-learn scene-midi-learn';
            midiLearnBtn.innerHTML = scene.midiMapping ? '<i class="fas fa-music"></i> Remapped' : '<i class="fas fa-music"></i> MIDI Map';
            midiLearnBtn.dataset.scene = scene.name;
            if (scene.midiMapping) {
                midiLearnBtn.classList.add('mapped');
            }
            midiLearnBtn.addEventListener('click', () => startSceneMidiLearn(scene.name));

            cardFooter.appendChild(loadButton);
            cardFooter.appendChild(editButton);
            cardFooter.appendChild(deleteButton);
            cardFooter.appendChild(midiLearnBtn);
            
            sceneDiv.appendChild(cardHeader);
            sceneDiv.appendChild(cardBody);
            sceneDiv.appendChild(cardFooter);

            savedScenesList.appendChild(sceneDiv);
        });
    }

    function renderSceneGallery() {
        sceneGalleryList.innerHTML = '';

        scenes.forEach(scene => {
            const sceneDiv = document.createElement('div');
            sceneDiv.className = 'scene-gallery-item';

            // Create a visual representation of the scene
            const sceneVisual = document.createElement('div');
            sceneVisual.className = 'scene-visual';
            
            // Use the scene's channel values to create a color gradient
            let gradientColors = [];
            const rgbChannels = getSceneRGBChannels(scene);
            if (rgbChannels.length > 0) {
                gradientColors = rgbChannels.map(rgb => `rgb(${rgb.r},${rgb.g},${rgb.b})`);
            } else {
                // Use intensity values to create grayscale gradient
                const intensities = getSceneIntensities(scene);
                gradientColors = intensities.map(i => `rgba(255,255,255,${i/255})`);
            }
            
            if (gradientColors.length > 0) {
                const gradient = `linear-gradient(45deg, ${gradientColors.join(', ')})`;
                sceneVisual.style.background = gradient;
            } else {
                sceneVisual.style.background = '#333';
            }

            const sceneInfo = document.createElement('div');
            sceneInfo.className = 'scene-info';

            const sceneHeader = document.createElement('h3');
            sceneHeader.textContent = scene.name;

            const sceneAddress = document.createElement('p');
            sceneAddress.textContent = `OSC: ${scene.oscAddress}`;

            const loadButton = document.createElement('button');
            loadButton.innerHTML = '<i class="fas fa-magic"></i> Manifest';
            loadButton.addEventListener('click', () => loadScene(scene.name));

            sceneInfo.appendChild(sceneHeader);
            sceneInfo.appendChild(sceneAddress);
            sceneInfo.appendChild(loadButton);

            sceneDiv.appendChild(sceneVisual);
            sceneDiv.appendChild(sceneInfo);

            sceneGalleryList.appendChild(sceneDiv);
        });
    }

    function getSceneRGBChannels(scene) {
        const rgbSets = [];
        const channelValues = scene.channelValues;
        
        // Try to identify RGB channel groups
        for (let i = 0; i < channelValues.length - 2; i++) {
            // Naive approach: assume consecutive channels might be RGB
            // In a real implementation, you'd use fixture definitions
            if (i + 2 < channelValues.length) {
                rgbSets.push({
                    r: channelValues[i],
                    g: channelValues[i + 1],
                    b: channelValues[i + 2]
                });
                // Skip the next two channels as we've used them
                i += 2;
            }
        }
        
        return rgbSets;
    }

    function getSceneIntensities(scene) {
        // Extract intensity values (consider every 50th channel for variety)
        const intensities = [];
        const channelValues = scene.channelValues;
        
        for (let i = 0; i < channelValues.length; i += 50) {
            if (channelValues[i] !== undefined) {
                intensities.push(channelValues[i]);
            }
        }
        
        return intensities.length > 0 ? intensities : [127]; // Default middle intensity
    }

    function updateChannel(channel, value) {
        dmxChannels[channel] = value;
        socket.emit('setDmxChannel', { channel, value });
        updateDmxSlider(channel, value);
    }

    function updateDmxSlider(channel, value) {
        const slider = document.querySelector(`.dmx-slider[data-channel="${channel}"]`);
        const fixtureSlider = document.querySelector(`.fixture-slider[data-channel="${channel}"]`);
        const valueDisplay = slider ? slider.nextElementSibling : null;
        const fixtureValueDisplay = fixtureSlider ? fixtureSlider.nextElementSibling : null;
        
        // Update the channelDiv to show visual feedback for high values
        const channelDiv = document.querySelector(`.dmx-channel[data-channel="${channel}"]`);
        
        if (slider) {
            slider.value = value;
            
            // Add a visual animation for significant changes
            slider.classList.remove('value-change');
            void slider.offsetWidth; // Trigger reflow
            slider.classList.add('value-change');
        }

        if (valueDisplay) {
            // Add previous value as data attribute for animation
            const prevValue = valueDisplay.textContent;
            valueDisplay.dataset.prevValue = prevValue;
            valueDisplay.textContent = value;
            
            // Visual effect for value change
            valueDisplay.classList.remove('value-change');
            void valueDisplay.offsetWidth; // Trigger reflow
            valueDisplay.classList.add('value-change');
            
            // Change background color based on value intensity
            const intensity = value / 255;
            const bgColor = calculateBgColorFromValue(value);
            valueDisplay.style.backgroundColor = bgColor;
            
            // For high values, add text shadow for glow effect
            if (value > 200) {
                valueDisplay.style.textShadow = '0 0 5px rgba(255, 255, 255, 0.7)';
            } else {
                valueDisplay.style.textShadow = 'none';
            }
        }

        if (fixtureSlider) {
            fixtureSlider.value = value;
        }

        if (fixtureValueDisplay) {
            fixtureValueDisplay.textContent = value;
            
            // Same visual effect for fixture value displays
            const bgColor = calculateBgColorFromValue(value);
            fixtureValueDisplay.style.backgroundColor = bgColor;
        }
        
        // Add visual indicator to the channel card for high values
        if (channelDiv) {
            if (value > 200) {
                channelDiv.classList.add('high-value');
            } else if (value > 100) {
                channelDiv.classList.add('medium-value');
                channelDiv.classList.remove('high-value');
            } else {
                channelDiv.classList.remove('medium-value', 'high-value');
            }
        }
    }
    
    // Helper function to calculate background color based on value
    function calculateBgColorFromValue(value) {
        const intensity = value / 255;
        
        if (value > 200) {
            // Bright value - create a gradient
            return `rgba(${Math.min(value, 255)}, ${Math.min(value * 0.8, 255)}, 0, 0.6)`;
        } else if (value > 100) {
            // Medium value
            return `rgba(100, 100, 100, ${intensity * 0.7})`;
        } else {
            // Low value
            return `rgba(50, 50, 50, ${intensity * 0.5})`;
        }
    }

    function startMidiLearn(channel) {
        // First, stop any ongoing MIDI learn
        if (currentMidiLearnChannel !== null) {
            const oldButton = document.querySelector(`.midi-learn[data-channel="${currentMidiLearnChannel}"]`);
            if (oldButton) {
                oldButton.classList.remove('learning');
                oldButton.textContent = midiMappings[currentMidiLearnChannel] ? 'Mapped' : 'MIDI Learn';
            }
        }

        // Set the current channel for learning
        currentMidiLearnChannel = channel;
        const button = document.querySelector(`.midi-learn[data-channel="${channel}"]`);
        if (button) {
            button.classList.add('learning');
            button.textContent = 'Listening...';
        }

        // Tell the server to start listening for MIDI messages for this channel
        socket.emit('learnMidiMapping', { channel });

        // Set a timeout to cancel the MIDI learn after 10 seconds
        if (midiLearnTimeout) {
            clearTimeout(midiLearnTimeout);
        }

        midiLearnTimeout = setTimeout(() => {
            if (currentMidiLearnChannel !== null) {
                const timeoutButton = document.querySelector(`.midi-learn[data-channel="${currentMidiLearnChannel}"]`);
                if (timeoutButton) {
                    timeoutButton.classList.remove('learning');
                    timeoutButton.textContent = midiMappings[currentMidiLearnChannel] ? 'Mapped' : 'MIDI Learn';
                }
                showMessage('MIDI learning timed out. Patience, mon ami, and try again.', 'error');
                currentMidiLearnChannel = null;
            }
        }, 10000);

        log(`MIDI learn initiated for channel ${channel} - awaiting digital incantation`);
    }

    function startSceneMidiLearn(sceneName) {
        // First, stop any ongoing MIDI learn
        if (currentMidiLearnScene !== null) {
            const oldButton = document.querySelector(`.scene-midi-learn[data-scene="${currentMidiLearnScene}"]`);
            if (oldButton) {
                oldButton.classList.remove('learning');
                oldButton.innerHTML = scenes.find(s => s.name === currentMidiLearnScene)?.midiMapping ? 
                    '<i class="fas fa-music"></i> Remapped' : '<i class="fas fa-music"></i> MIDI Map';
            }
        }

        // Set the current scene for learning
        currentMidiLearnScene = sceneName;
        const button = document.querySelector(`.scene-midi-learn[data-scene="${sceneName}"]`);
        if (button) {
            button.classList.add('learning');
            button.innerHTML = '<i class="fas fa-hourglass"></i> Listening...';
        }

        // Tell the server to start listening for MIDI messages for this scene
        socket.emit('learnSceneMidiMapping', { sceneName });

        // Set a timeout to cancel the MIDI learn after 10 seconds
        if (midiLearnTimeout) {
            clearTimeout(midiLearnTimeout);
        }

        midiLearnTimeout = setTimeout(() => {
            if (currentMidiLearnScene !== null) {
                const timeoutButton = document.querySelector(`.scene-midi-learn[data-scene="${currentMidiLearnScene}"]`);
                if (timeoutButton) {
                    timeoutButton.classList.remove('learning');
                    timeoutButton.innerHTML = scenes.find(s => s.name === currentMidiLearnScene)?.midiMapping ? 
                        '<i class="fas fa-music"></i> Remapped' : '<i class="fas fa-music"></i> MIDI Map';
                }
                showMessage('MIDI learning timed out. The digital muse remained silent.', 'error');
                currentMidiLearnScene = null;
            }
        }, 10000);

        log(`MIDI learn initiated for scene "${sceneName}" - awaiting your MIDI gesture`);
    }

    function saveScene() {
        const name = sceneName.value.trim();
        const oscAddress = sceneOscAddress.value.trim();

        if (!name) {
            showMessage('Please bestow a title upon your masterpiece, mon cher', 'error');
            return;
        }

        if (!oscAddress) {
            showMessage('A proper OSC address is required for this luminous creation', 'error');
            return;
        }

        socket.emit('saveScene', { name, oscAddress, state: dmxChannels });
        log(`Scene "${name}" captured with OSC address "${oscAddress}" - a moment of brilliance preserved`);
    }

    function loadScene(name) {
        socket.emit('loadScene', { name });
        log(`Summoning scene "${name}" onto the canvas - let there be light!`);
    }

    function loadSelectedScene() {
        const selectedScene = loadSceneSelect.value;
        if (selectedScene) {
            loadScene(selectedScene);
        } else {
            showMessage('One must select a scene before manifesting it, naturellement', 'error');
        }
    }

    function editScene(scene) {
        sceneName.value = scene.name;
        sceneOscAddress.value = scene.oscAddress;
        showMessage(`Scene "${scene.name}" is now available for your artistic revision`, 'success');
    }

    function deleteScene(name) {
        if (confirm(`Are you certain you wish to erase "${name}" from existence? This act of artistic destruction cannot be undone.`)) {
            socket.emit('deleteScene', { name });
            scenes = scenes.filter(scene => scene.name !== name);
            updateSceneSelects();
            renderSceneGallery();
            showMessage(`Scene "${name}" has been expunged from the gallery with artistic prejudice`, 'success');
            log(`Scene "${name}" deleted from the artistic record`);
        }
    }

    function clearAllScenes() {
        if (confirm('Are you absolutely certain you wish to purge the entire gallery? This most dramatic act of artistic destruction cannot be undone, and will erase all evidence of your previous creative endeavors.')) {
            socket.emit('clearAllScenes');
            scenes = [];
            updateSceneSelects();
            renderSceneGallery();
            showMessage('The gallery has been purged - a blank canvas awaits your genius', 'success');
            log('All scenes cleared from the gallery - tabula rasa achieved');
        }
    }

    function updateTransitionDuration() {
        const duration = transitionDuration.value;
        transitionDurationValue.textContent = `${duration} s`;
        log(`Temporal flow adjusted to ${duration} seconds - the pace of your artistic expression`);
    }

    function updateTransitionScenes() {
        sceneTransition.fromScene = sceneTransitionFrom.value;
        sceneTransition.toScene = sceneTransitionTo.value;
        
        // Reset transition slider when scenes change
        transitionSlider.value = 0;
        updateTransition();
    }

    function updateTransition() {
        const progress = parseInt(transitionSlider.value);
        sceneTransition.progress = progress;
        
        // Update the display with a poetic description
        const stateIndex = Math.floor(progress / 10);
        transitionSliderValue.textContent = `${progress}% - ${stateTitles[stateIndex]}`;
        
        // If we have both scenes selected, calculate the transition
        if (sceneTransition.fromScene && sceneTransition.toScene) {
            const fromScene = scenes.find(s => s.name === sceneTransition.fromScene);
            const toScene = scenes.find(s => s.name === sceneTransition.toScene);
            
            if (fromScene && toScene) {
                // Calculate the intermediate DMX values
                const transitionValues = fromScene.channelValues.map((fromVal, idx) => {
                    const toVal = toScene.channelValues[idx] || 0;
                    return Math.round(fromVal + (toVal - fromVal) * (progress / 100));
                });
                
                // Apply the intermediate values
                transitionValues.forEach((value, idx) => {
                    updateChannel(idx, value);
                });
                
                log(`Transition at ${progress}% between "${sceneTransition.fromScene}" and "${sceneTransition.toScene}" - the metamorphosis unfolds`);
            }
        }
    }

    function updateAutoPilotScenes() {
        autoPilot.fromScene = autoPilotSceneFrom.value;
        autoPilot.toScene = autoPilotSceneTo.value;
        
        // Reset auto pilot slider when scenes change
        autoPilotSlider.value = 0;
        updateAutoPilotDisplay();
    }

    function toggleAutoPilot() {
        autoPilot.active = autoPilotToggle.checked;
        
        if (autoPilot.active) {
            if (!autoPilot.fromScene || !autoPilot.toScene) {
                showMessage('One must select both origin and destination scenes for the journey, mon ami', 'error');
                autoPilotToggle.checked = false;
                autoPilot.active = false;
                return;
            }
            
            // Start auto pilot interval
            const duration = parseInt(transitionDuration.value) * 1000;
            autoPilot.duration = duration;
            autoPilot.progress = 0;
            autoPilotSlider.value = 0;
            
            if (autoPilotInterval) {
                clearInterval(autoPilotInterval);
            }
            
            const updateInterval = 50; // 50ms for smooth animation
            const step = 100 / (duration / updateInterval);
            
            autoPilotInterval = setInterval(() => {
                autoPilot.progress += step;
                if (autoPilot.progress >= 100) {
                    // Swap scenes and reset progress
                    const temp = autoPilot.fromScene;
                    autoPilot.fromScene = autoPilot.toScene;
                    autoPilot.toScene = temp;
                    autoPilot.progress = 0;
                    
                    // Update the UI
                    autoPilotSceneFrom.value = autoPilot.fromScene;
                    autoPilotSceneTo.value = autoPilot.toScene;
                }
                
                autoPilotSlider.value = autoPilot.progress;
                updateAutoPilotTransition();
            }, updateInterval);
            
            log(`Auto pilot engaged between "${autoPilot.fromScene}" and "${autoPilot.toScene}" with ${duration/1000}s temporal flow - the autonomous journey begins`);
            showMessage('Autonomous expression engaged - the lights now dance to their own rhythm', 'success');
        } else {
            // Stop auto pilot
            if (autoPilotInterval) {
                clearInterval(autoPilotInterval);
                autoPilotInterval = null;
            }
            
            log('Auto pilot disengaged - control returns to the maestro');
            showMessage('Autonomous expression halted - you have reclaimed the artistic reins', 'success');
        }
    }

    function updateAutoPilotTransition() {
        const progress = autoPilot.progress;
        
        // Update the display with a poetic description
        const stateIndex = Math.floor(progress / 10);
        autoPilotSliderValue.textContent = `${Math.round(progress)}% - ${stateTitles[stateIndex]}`;
        
        // Calculate the intermediate DMX values
        const fromScene = scenes.find(s => s.name === autoPilot.fromScene);
        const toScene = scenes.find(s => s.name === autoPilot.toScene);
        
        if (fromScene && toScene) {
            const transitionValues = fromScene.channelValues.map((fromVal, idx) => {
                const toVal = toScene.channelValues[idx] || 0;
                return Math.round(fromVal + (toVal - fromVal) * (progress / 100));
            });
            
            // Apply the intermediate values
            transitionValues.forEach((value, idx) => {
                updateChannel(idx, value);
            });
            
            // Show OSC Out activity when values change significantly
            if (Math.round(progress) % 10 === 0) {
                triggerOscOutActivity();
            }
        }
        
        updateAutoPilotDisplay();
    }

    function updateAutoPilotDisplay() {
        const remainingTime = autoPilot.active ? 
            Math.round((autoPilot.duration / 1000) * (100 - autoPilot.progress) / 100) : 
            parseInt(transitionDuration.value);
            
        autoPilotDurationDisplay.textContent = `Time until metamorphosis: ${remainingTime}s`;
    }

    function tapTempo() {
        const now = Date.now();
        tapTimes.push(now);
        
        // Keep only the last 4 taps for calculating BPM
        if (tapTimes.length > 4) {
            tapTimes.shift();
        }
        
        // Calculate BPM if we have at least 2 taps
        if (tapTimes.length >= 2) {
            const intervals = [];
            for (let i = 1; i < tapTimes.length; i++) {
                intervals.push(tapTimes[i] - tapTimes[i - 1]);
            }
            
            const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
            currentBPM = Math.round(60000 / averageInterval);
            
            // Update BPM display
            bpmDisplay.textContent = `BPM: ${currentBPM} - The pulse of your creation`;
            log(`Rhythmic pulse established at ${currentBPM} BPM - the heartbeat of your luminous composition`);
        }
        
        // Visual feedback
        tapButton.classList.add('tapped');
        setTimeout(() => {
            tapButton.classList.remove('tapped');
        }, 100);
    }

    function syncLightsToBPM() {
        if (currentBPM === 0) {
            showMessage('One must first establish a rhythmic pulse with the TAP button, mon cher', 'error');
            return;
        }
        
        showMessage(`Synchronizing luminescence to ${currentBPM} BPM - the light now dances to your tempo`, 'success');
        log(`Synchronizing lights to ${currentBPM} BPM - rhythm and light become one`);
        
        // Calculate interval in milliseconds
        const interval = 60000 / currentBPM;
        
        // Tell the server to start syncing lights to this BPM
        socket.emit('syncLightsToBPM', { bpm: currentBPM, interval });
    }

    function openColorPicker() {
        // Reset the color picker to white
        redSlider.value = 255;
        greenSlider.value = 255;
        blueSlider.value = 255;
        redValue.textContent = '255';
        greenValue.textContent = '255';
        blueValue.textContent = '255';
        colorPreview.style.backgroundColor = 'rgb(255,255,255)';
        
        colorPickerModal.style.display = 'flex';
    }

    function updateColorPreview() {
        const r = redSlider.value;
        const g = greenSlider.value;
        const b = blueSlider.value;
        
        redValue.textContent = r;
        greenValue.textContent = g;
        blueValue.textContent = b;
        
        colorPreview.style.backgroundColor = `rgb(${r},${g},${b})`;
    }

    function saveAndApplyCustomColor() {
        const r = redSlider.value;
        const g = greenSlider.value;
        const b = blueSlider.value;
        
        // Add this color to the palette
        const newPreset = document.createElement('div');
        newPreset.className = 'color-preset';
        newPreset.style.backgroundColor = `rgb(${r},${g},${b})`;
        newPreset.dataset.color = `${r},${g},${b}`;
        newPreset.addEventListener('click', () => {
            applyColorToSelectedChannels(`${r},${g},${b}`);
        });
        
        // Insert before the custom color button
        colorPalette.insertBefore(newPreset, document.querySelector('.custom-color'));
        
        // Apply the color
        applyColorToSelectedChannels(`${r},${g},${b}`);
        
        // Close the modal
        colorPickerModal.style.display = 'none';
        
        log(`Custom color rgb(${r},${g},${b}) created and applied - a unique chromatic expression`);
    }

    function applyColorToSelectedChannels(colorString) {
        const selectedChannels = document.querySelectorAll('.channel-select:checked');
        
        if (selectedChannels.length === 0) {
            showMessage('One must select channels before applying color, mon ami', 'error');
            return;
        }
        
        // If this is a standard RGB color format, we need at least 3 channels
        const [r, g, b] = colorString.split(',').map(Number);
        
        if (selectedChannels.length < 3 && r !== undefined && g !== undefined && b !== undefined) {
            showMessage('For a proper RGB expression, one requires at least three channels', 'error');
            return;
        }
        
        // Group channels in sets of 3 for RGB
        const channelGroups = [];
        let currentGroup = [];
        
        selectedChannels.forEach(checkbox => {
            currentGroup.push(parseInt(checkbox.dataset.channel));
            
            if (currentGroup.length === 3) {
                channelGroups.push([...currentGroup]);
                currentGroup = [];
            }
        });
        
        // Handle any remaining channels
        if (currentGroup.length > 0) {
            channelGroups.push(currentGroup);
        }
        
        // Apply the RGB color to each group
        channelGroups.forEach(group => {
            if (group.length >= 3 && r !== undefined && g !== undefined && b !== undefined) {
                updateChannel(group[0], r);
                updateChannel(group[1], g);
                updateChannel(group[2], b);
                
                // Store the color for these channels
                channelColors[group[0]] = `${r},${g},${b}`;
                
                // Update the channel borders
                const channelDivs = document.querySelectorAll(`.dmx-channel[data-channel="${group[0]}"], .dmx-channel[data-channel="${group[1]}"], .dmx-channel[data-channel="${group[2]}"]`);
                channelDivs.forEach(div => {
                    div.style.borderLeft = `3px solid rgb(${r},${g},${b})`;
                });
            } else {
                // For non-RGB groups, just set all to the same value
                const value = Math.max(r, g, b); // Use the brightest component
                group.forEach(ch => updateChannel(ch, value));
            }
        });
        
        // Trigger OSC Out activity
        triggerOscOutActivity();
        
        log(`Applied color rgb(${r},${g},${b}) to ${selectedChannels.length} channels - a splash of chromatic brilliance`);
        showMessage(`Color applied to ${selectedChannels.length} channels with artistic flourish`, 'success');
    }

    function editFixture(index) {
        // We'd implement the fixture editing UI here
        log(`Preparing to revise fixture ${fixtures[index].name} - the canvas of creation opens`);
    }

    function deleteFixture(index) {
        if (confirm(`Are you certain you wish to remove "${fixtures[index].name}" from your composition? This act of curatorial discretion cannot be undone.`)) {
            socket.emit('deleteFixture', { index });
            fixtures = fixtures.filter((_, i) => i !== index);
            renderFixtures();
            renderGroups(); // Re-render groups as they might reference this fixture
            showMessage(`Fixture "${fixtures[index].name}" has been removed from the composition`, 'success');
            log(`Fixture with index ${index} removed from the artistic palette`);
        }
    }

    function editGroup(index) {
        // We'd implement the group editing UI here
        log(`Preparing to revise group ${groups[index].name} - reconfiguring the collective expression`);
    }

    function deleteGroup(index) {
        if (confirm(`Are you certain you wish to dissolve the "${groups[index].name}" collective? This curatorial act cannot be undone.`)) {
            socket.emit('deleteGroup', { index });
            groups = groups.filter((_, i) => i !== index);
            renderGroups();
            showMessage(`Group "${groups[index].name}" has been dissolved from the collective`, 'success');
            log(`Group with index ${index} dissolved from the artistic taxonomy`);
        }
    }

    function log(message) {
        const timestamp = new Date().toLocaleTimeString();
        debugOutput.textContent = `${timestamp} - ${message}\n${debugOutput.textContent}`;
        
        // Trim log if it gets too long
        if (debugOutput.textContent.length > 5000) {
            debugOutput.textContent = debugOutput.textContent.substring(0, 5000) + "...";
        }
    }
    
    // UI Theme functionality
    function changeUITheme(themeName, skipMessage = false) {
        console.log(`Changing theme to: ${themeName}`);
        
        // Remove all theme classes from body
        document.body.classList.remove('artsnob', 'standard', 'minimal');
        
        // Add selected theme class
        document.body.classList.add(themeName);
        
        // Create a completely new stylesheet element to ensure it's refreshed
        const oldStylesheet = document.getElementById('themeStylesheet');
        if (oldStylesheet) {
            oldStylesheet.remove();
        }
        
        // Create and add the new stylesheet with a cache-busting parameter
        const newStylesheet = document.createElement('link');
        newStylesheet.rel = 'stylesheet';
        newStylesheet.id = 'themeStylesheet';
        newStylesheet.href = `theme-${themeName}.css?v=${Date.now()}`;
        document.head.appendChild(newStylesheet);
        
        // Save theme preference to local storage
        localStorage.setItem('dmxTheme', themeName);
        
        // Get current theme mode and ensure it's applied to body too
        const themeMode = document.documentElement.getAttribute('data-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', themeMode);
        document.body.setAttribute('data-theme', themeMode);
        
        // Update text content based on theme (nav buttons, headers, etc.)
        updateThemeTextContent(themeName);
        
        // Sync theme selector dropdowns
        const uiThemeSelect = document.getElementById('uiThemeSelect');
        if (uiThemeSelect) {
            uiThemeSelect.value = themeName;
        }
        
        const settingsThemeSelect = document.getElementById('settingsThemeSelect');
        if (settingsThemeSelect) {
            settingsThemeSelect.value = themeName;
        }
        
        // Update theme mode toggle in settings if it exists
        const settingsThemeMode = document.getElementById('settingsThemeMode');
        if (settingsThemeMode) {
            settingsThemeMode.checked = themeMode === 'light';
            
            const settingsThemeToggle = document.getElementById('settingsThemeToggle');
            if (settingsThemeToggle) {
                settingsThemeToggle.innerHTML = themeMode === 'light' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            }
        }
        
        const themeNames = {
            'artsnob': 'Art Critic Extraordinaire',
            'standard': 'Standard DMX Controller',
            'minimal': 'Minimalist'
        };
        
        const messagesByTheme = {
            'artsnob': 'Aesthetic sensibility transformed to the heightened artistic expression - the interface transcends mundane functionality',
            'standard': 'Interface changed to Standard DMX Controller mode - clean, professional, and functional',
            'minimal': 'Interface simplified to Minimalist mode - pure functionality without distraction'
        };
        
        // Make sure UI updates immediately
        setTimeout(() => {
            // Only show message if not skipped (used during theme+mode changes)
            if (!skipMessage) {
                showMessage(messagesByTheme[themeName] || `Theme changed to ${themeNames[themeName]}`, 'success');
                log(`UI theme changed to ${themeNames[themeName]}`);
            }
            
            // Force another theme content update after a brief delay
            // This ensures all dynamic content is properly updated
            setTimeout(() => {
                updateThemeTextContent(themeName);
            }, 100);
        }, 100);
        
        // Force redraw of everything
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force reflow
        document.body.style.display = '';
    }
    
    // Update text content based on selected theme
    function updateThemeTextContent(themeName) {
        // Theme-specific text replacements
        const textReplacements = {
            'artsnob': {
                'appTitle': 'ArtBastard DMX512FTW: The Luminary Palette',
                'dmxChannelsTitle': 'DMX Channels <span class="art-subtitle">The Elemental Brushstrokes</span>',
                'scenesTitle': 'Scenes <span class="art-subtitle">Choreographies of Light</span>',
                'colorPaletteTitle': 'Color Palette <span class="art-subtitle">Chromatic Expressions</span>',
                'groupControlsTitle': 'Group Controls <span class="art-subtitle">Collective Light Sculptures</span>',
                'createGroupBtn': '<i class="fas fa-object-group"></i> Form Selected Channel Ensemble',
                'selectAllBtn': '<i class="fas fa-check-double"></i> Select All Channels',
                'deselectAllBtn': '<i class="fas fa-times"></i> Deselect All',
                'invertSelectionBtn': '<i class="fas fa-exchange-alt"></i> Invert Selection',
                'popoutBtn': '<i class="fas fa-external-link-alt"></i> Liberate to Separate Canvas',
                'themeLabel': 'Aesthetic Mode:',
                // Nav buttons
                'navMain': '<i class="fas fa-lightbulb"></i> Luminous Canvas',
                'navMidiOsc': '<i class="fas fa-sliders-h"></i> MIDI/OSC Atelier',
                'navFixture': '<i class="fas fa-object-group"></i> Fixture Composition',
                'navScenes': '<i class="fas fa-theater-masks"></i> Scene Gallery',
                'navOscDebug': '<i class="fas fa-bug"></i> OSC Critique',
                'navMisc': '<i class="fas fa-cog"></i> Avant-Garde Settings',
                // Scene management
                'saveScene': '<i class="fas fa-save"></i> Immortalize Scene',
                'clearAllScenes': '<i class="fas fa-trash-alt"></i> Purge Gallery',
                'loadSceneButton': '<i class="fas fa-magic"></i> Manifest',
                'sceneName_placeholder': 'Bestow a title upon your luminous creation...',
                'sceneOscAddress_placeholder': 'Assign an OSC address to your masterpiece...',
                'loadSceneSelect_placeholder': 'Select a masterpiece to materialize...'
            },
            'standard': {
                'appTitle': 'DMX512 Controller',
                'dmxChannelsTitle': 'DMX Channels',
                'scenesTitle': 'Scenes',
                'colorPaletteTitle': 'Color Tools',
                'groupControlsTitle': 'Group Controls',
                'createGroupBtn': '<i class="fas fa-object-group"></i> Create Group',
                'selectAllBtn': '<i class="fas fa-check-double"></i> Select All',
                'deselectAllBtn': '<i class="fas fa-times"></i> Clear Selection',
                'invertSelectionBtn': '<i class="fas fa-exchange-alt"></i> Invert Selection',
                'popoutBtn': '<i class="fas fa-external-link-alt"></i> Pop Out Selected',
                'themeLabel': 'Theme:',
                // Nav buttons
                'navMain': '<i class="fas fa-lightbulb"></i> Control Panel',
                'navMidiOsc': '<i class="fas fa-sliders-h"></i> MIDI/OSC Setup',
                'navFixture': '<i class="fas fa-object-group"></i> Fixture Setup',
                'navScenes': '<i class="fas fa-theater-masks"></i> Scene Management',
                'navOscDebug': '<i class="fas fa-bug"></i> OSC Debug',
                'navMisc': '<i class="fas fa-cog"></i> Settings',
                // Scene management
                'saveScene': '<i class="fas fa-save"></i> Save Scene',
                'clearAllScenes': '<i class="fas fa-trash-alt"></i> Clear All Scenes',
                'loadSceneButton': '<i class="fas fa-magic"></i> Load Scene',
                'sceneName_placeholder': 'Enter scene name...',
                'sceneOscAddress_placeholder': 'Enter OSC address...',
                'loadSceneSelect_placeholder': 'Select a scene to load...'
            },
            'minimal': {
                'appTitle': 'DMX Controller',
                'dmxChannelsTitle': 'Channels',
                'scenesTitle': 'Scenes',
                'colorPaletteTitle': 'Colors',
                'groupControlsTitle': 'Groups',
                'createGroupBtn': '<i class="fas fa-object-group"></i> Group',
                'selectAllBtn': '<i class="fas fa-check-double"></i> All',
                'deselectAllBtn': '<i class="fas fa-times"></i> None',
                'invertSelectionBtn': '<i class="fas fa-exchange-alt"></i> Invert',
                'popoutBtn': '<i class="fas fa-external-link-alt"></i> Pop Out',
                'themeLabel': 'Theme:',
                // Nav buttons
                'navMain': '<i class="fas fa-lightbulb"></i> Main',
                'navMidiOsc': '<i class="fas fa-sliders-h"></i> MIDI/OSC',
                'navFixture': '<i class="fas fa-object-group"></i> Fixtures',
                'navScenes': '<i class="fas fa-theater-masks"></i> Scenes',
                'navOscDebug': '<i class="fas fa-bug"></i> Debug',
                'navMisc': '<i class="fas fa-cog"></i> Settings',
                // Scene management
                'saveScene': '<i class="fas fa-save"></i> Save',
                'clearAllScenes': '<i class="fas fa-trash-alt"></i> Clear',
                'loadSceneButton': '<i class="fas fa-magic"></i> Load',
                'sceneName_placeholder': 'Scene name',
                'sceneOscAddress_placeholder': 'OSC address',
                'loadSceneSelect_placeholder': 'Select scene'
            }
        };
        
        // Get text objects for current theme
        const texts = textReplacements[themeName] || textReplacements['standard'];
        
        // Helper function to update content by selector
        function updateContent(selector, contentKey) {
            const elements = document.querySelectorAll(selector);
            if (elements && elements.length > 0) {
                elements.forEach(element => {
                    if (texts[contentKey]) {
                        element.innerHTML = texts[contentKey];
                    }
                });
            }
        }
        
        // Helper function to update placeholder by selector
        function updatePlaceholder(selector, contentKey) {
            const elements = document.querySelectorAll(selector);
            if (elements && elements.length > 0) {
                elements.forEach(element => {
                    if (texts[contentKey]) {
                        element.placeholder = texts[contentKey];
                    }
                });
            }
        }
        
        // Helper function to find h2 elements containing text
        function updateH2ByContent(contentPattern, contentKey) {
            const h2Elements = document.querySelectorAll('h2');
            h2Elements.forEach(element => {
                const text = element.textContent.toLowerCase();
                if (contentPattern.some(pattern => text.includes(pattern.toLowerCase()))) {
                    element.innerHTML = texts[contentKey];
                }
            });
        }
        
        // Update main title
        updateContent('h1', 'appTitle');
        
        // Update section titles by content
        updateH2ByContent(['DMX Channel', 'Channel'], 'dmxChannelsTitle');
        updateH2ByContent(['Scene', 'Scenes'], 'scenesTitle');
        updateH2ByContent(['Color', 'Colors'], 'colorPaletteTitle');
        updateH2ByContent(['Group Control', 'Groups'], 'groupControlsTitle');
        
        // Update buttons by ID
        updateContent('#createQuickGroup', 'createGroupBtn');
        updateContent('#selectAllChannels', 'selectAllBtn');
        updateContent('#deselectAllChannels', 'deselectAllBtn');
        updateContent('#invertChannelSelection', 'invertSelectionBtn');
        updateContent('#popoutChannels', 'popoutBtn');
        
        // Update navigation buttons
        updateContent('#navMain', 'navMain');
        updateContent('#navMidiOsc', 'navMidiOsc');
        updateContent('#navFixture', 'navFixture');
        updateContent('#navScenes', 'navScenes'); 
        updateContent('#navOscDebug', 'navOscDebug');
        updateContent('#navMisc', 'navMisc');
        
        // Update scene management buttons
        updateContent('#saveScene', 'saveScene');
        updateContent('#clearAllScenes', 'clearAllScenes');
        updateContent('#loadSceneButton', 'loadSceneButton');
        
        // Update placeholders
        updatePlaceholder('#sceneName', 'sceneName_placeholder');
        updatePlaceholder('#sceneOscAddress', 'sceneOscAddress_placeholder');
        
        // Update select placeholders (first option)
        const loadSceneSelect = document.querySelector('#loadSceneSelect option:first-child');
        if (loadSceneSelect) {
            loadSceneSelect.textContent = texts.loadSceneSelect_placeholder;
        }
        
        // Update theme selection labels
        const themeLabels = document.querySelectorAll('.theme-selection label');
        if (themeLabels && themeLabels.length > 0) {
            themeLabels.forEach(label => {
                label.textContent = texts.themeLabel;
            });
        }
        
        // Hide/show art quotes based on theme
        const artQuotes = document.querySelectorAll('.art-quote');
        artQuotes.forEach(quote => {
            quote.style.display = themeName === 'artsnob' ? 'block' : 'none';
        });
        
        // Update all art-subtitle elements visibility
        const artSubtitles = document.querySelectorAll('.art-subtitle');
        artSubtitles.forEach(subtitle => {
            subtitle.style.display = themeName === 'artsnob' ? 'inline' : 'none';
        });
    }
    
    // Quick Group functionality
    function createQuickGroup() {
        const selectedChannels = document.querySelectorAll('.channel-select:checked');
        
        if (selectedChannels.length === 0) {
            showMessage('One must select channels before forming an ensemble, mon cher', 'error');
            return;
        }
        
        // Create a unique group ID
        const groupId = 'qg-' + Date.now();
        
        // Get the channel numbers of selected channels
        const channelNumbers = Array.from(selectedChannels).map(checkbox => parseInt(checkbox.dataset.channel));
        
        // Create a name for the quick group based on channels
        let groupName = 'Ensemble';
        if (channelNumbers.length <= 5) {
            groupName += ': Ch ' + channelNumbers.join(', ');
        } else {
            groupName += `: Ch ${channelNumbers[0]}-${channelNumbers[channelNumbers.length-1]} (${channelNumbers.length})`;
        }
        
        // Get quick groups container
        const quickGroupsContainer = document.getElementById('quickGroupsContainer');
        
        // Create a new quick group element
        const quickGroup = document.createElement('div');
        quickGroup.className = 'quick-group';
        quickGroup.id = groupId;
        quickGroup.dataset.channels = JSON.stringify(channelNumbers);
        
        const quickGroupHeader = document.createElement('div');
        quickGroupHeader.className = 'quick-group-header';
        
        const groupTitle = document.createElement('h4');
        groupTitle.className = 'quick-group-title';
        groupTitle.textContent = groupName;
        
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'quick-group-controls';
        
        const removeButton = document.createElement('button');
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.title = 'Remove group';
        removeButton.className = 'danger-button';
        removeButton.addEventListener('click', () => {
            quickGroup.remove();
            log(`Quick group "${groupName}" dissolved from the canvas`);
        });
        
        const popoutButton = document.createElement('button');
        popoutButton.innerHTML = '<i class="fas fa-external-link-alt"></i>';
        popoutButton.title = 'Open in new window';
        popoutButton.className = 'info-button';
        popoutButton.addEventListener('click', () => {
            popoutGroup(groupId, groupName, channelNumbers);
        });
        
        controlsDiv.appendChild(popoutButton);
        controlsDiv.appendChild(removeButton);
        
        quickGroupHeader.appendChild(groupTitle);
        quickGroupHeader.appendChild(controlsDiv);
        
        // Create a slider for the group
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = 255;
        slider.value = 0;
        slider.className = 'quick-group-slider';
        
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'channel-value';
        valueDisplay.textContent = '0';
        
        // Add event listener for the slider
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            valueDisplay.textContent = value;
            
            // Update all channels in the group
            channelNumbers.forEach(channel => updateChannel(channel, value));
            log(`Set all channels in "${groupName}" to value ${value}`);
        });
        
        quickGroup.appendChild(quickGroupHeader);
        quickGroup.appendChild(slider);
        quickGroup.appendChild(valueDisplay);
        
        quickGroupsContainer.appendChild(quickGroup);
        
        showMessage(`Quick group "${groupName}" formed with ${channelNumbers.length} channels`, 'success');
        log(`Created quick group with ${channelNumbers.length} channels`);
        
        // Deselect the channels
        deselectAllChannels();
    }
    
    function selectAllChannels() {
        const checkboxes = document.querySelectorAll('.channel-select');
        checkboxes.forEach(checkbox => { 
            checkbox.checked = true;
        });
        log('All DMX channels selected in the canvas');
    }
    
    function deselectAllChannels() {
        const checkboxes = document.querySelectorAll('.channel-select');
        checkboxes.forEach(checkbox => { 
            checkbox.checked = false;
        });
        log('All DMX channel selections cleared');
    }
    
    function invertChannelSelection() {
        const checkboxes = document.querySelectorAll('.channel-select');
        checkboxes.forEach(checkbox => { 
            checkbox.checked = !checkbox.checked;
        });
        log('DMX channel selection inverted');
    }
    
    function popoutSelectedChannels() {
        const selectedChannels = document.querySelectorAll('.channel-select:checked');
        
        if (selectedChannels.length === 0) {
            showMessage('One must select channels before liberating them to a separate canvas, mon cher', 'error');
            return;
        }
        
        // Get the channel numbers of selected channels
        const channelNumbers = Array.from(selectedChannels).map(checkbox => parseInt(checkbox.dataset.channel));
        
        // Generate a unique ID for this popout
        const popoutId = 'popout-' + Date.now();
        const popoutName = `Channels ${channelNumbers.length <= 5 ? channelNumbers.join(', ') : channelNumbers.length}`;
        
        popoutGroup(popoutId, popoutName, channelNumbers);
    }
    
    function popoutGroup(id, name, channelNumbers) {
        // Open a new window
        const popoutWindow = window.open('', id, 'width=800,height=600,resizable=yes,scrollbars=yes');
        
        // Get current theme class
        const currentTheme = Array.from(document.body.classList).find(cls => 
            ['artsnob', 'standard', 'minimal'].includes(cls)) || 'artsnob';
        
        // Get theme mode (light/dark)
        const themeMode = document.documentElement.getAttribute('data-theme') || 'dark';
            
        // Create the HTML content for the popout window
        const popoutContent = `
        <!DOCTYPE html>
        <html lang="en" data-theme="${themeMode}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ArtBastard DMX - ${name}</title>
            <link rel="stylesheet" href="styles.css">
            <link rel="stylesheet" href="theme-${currentTheme}.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
            <style>
                body { padding: 20px; }
                .header-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .all-channels-control { 
                    display: flex; 
                    flex-direction: column; 
                    padding: 15px; 
                    margin-bottom: 20px; 
                    background-color: var(--card-bg);
                    border-left: var(--card-border);
                }
                .dmx-slider.master { height: 15px; }
            </style>
        </head>
        <body class="${currentTheme} pop-out">
            <div class="header-controls">
                <h1>${name}</h1>
                <button id="closePopout" class="danger-button"><i class="fas fa-times"></i> Close</button>
            </div>
            
            <div class="all-channels-control">
                <h3>Master Control</h3>
                <input type="range" id="masterSlider" class="dmx-slider master" min="0" max="255" value="0">
                <div class="channel-value" id="masterValue">0</div>
            </div>
            
            <div id="popoutChannels"></div>
            
            <script>
                // Function to communicate with parent window
                function updateChannel(channel, value) {
                    window.opener.postMessage({
                        action: 'updateChannel',
                        channel: channel,
                        value: value
                    }, '*');
                    
                    // Update local display
                    const slider = document.querySelector(\`.dmx-slider[data-channel="\${channel}"]\`);
                    const valueDisplay = slider ? slider.nextElementSibling : null;
                    
                    if (slider) {
                        slider.value = value;
                    }
                    
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                }
                
                // Close button functionality
                document.getElementById('closePopout').addEventListener('click', () => {
                    window.close();
                });
                
                // Master slider functionality
                const masterSlider = document.getElementById('masterSlider');
                const masterValue = document.getElementById('masterValue');
                
                masterSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    masterValue.textContent = value;
                    
                    // Update all channels
                    const channels = ${JSON.stringify(channelNumbers)};
                    channels.forEach(channel => updateChannel(channel, value));
                });
                
                // Listen for messages from the parent window
                window.addEventListener('message', (event) => {
                    if (event.data.action === 'updateSlider') {
                        const slider = document.querySelector(\`.dmx-slider[data-channel="\${event.data.channel}"]\`);
                        const valueDisplay = slider ? slider.nextElementSibling : null;
                        
                        if (slider) {
                            slider.value = event.data.value;
                        }
                        
                        if (valueDisplay) {
                            valueDisplay.textContent = event.data.value;
                        }
                    }
                });
            </script>
        </body>
        </html>
        `;
        
        // Write the content to the popout window
        popoutWindow.document.open();
        popoutWindow.document.write(popoutContent);
        popoutWindow.document.close();
        
        // Function to create channel controls in the popout window
        const createChannelControls = () => {
            const popoutChannelsContainer = popoutWindow.document.getElementById('popoutChannels');
            if (!popoutChannelsContainer) return; // Window may be closed
            
            channelNumbers.forEach(channel => {
                const channelDiv = document.createElement('div');
                channelDiv.className = 'dmx-channel';
                
                const channelTitle = document.createElement('h3');
                channelTitle.innerHTML = `${channel + 1}: <small>${channelNames[channel]}</small>`;
                
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = 0;
                slider.max = 255;
                slider.value = dmxChannels[channel];
                slider.className = 'dmx-slider';
                slider.dataset.channel = channel;
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    updateChannel(channel, value);
                });
                
                const valueDisplay = document.createElement('div');
                valueDisplay.className = 'channel-value';
                valueDisplay.textContent = dmxChannels[channel];
                
                channelDiv.appendChild(channelTitle);
                channelDiv.appendChild(slider);
                channelDiv.appendChild(valueDisplay);
                
                popoutChannelsContainer.appendChild(channelDiv);
            });
        };
        
        // Wait for window to load
        popoutWindow.onload = createChannelControls;
        
        // Listen for messages from popout windows
        window.addEventListener('message', (event) => {
            if (event.data.action === 'updateChannel') {
                updateChannel(event.data.channel, event.data.value);
            }
        });
        
        log(`Liberated ${channelNumbers.length} channels to a separate canvas`);
    }
    
    // Override updateDmxSlider to also update popout windows
    const originalUpdateDmxSlider = updateDmxSlider;
    updateDmxSlider = function(channel, value) {
        // Call the original function
        originalUpdateDmxSlider(channel, value);
        
        // Update any open popout windows
        const message = {
            action: 'updateSlider',
            channel: channel,
            value: value
        };
        
        // Broadcast to all open windows that might contain this channel
        const openWindows = window.opener ? [window.opener] : [];
        for (const win of window.frames) {
            if (!win.closed) {
                openWindows.push(win);
            }
        }
        
        openWindows.forEach(win => {
            try {
                win.postMessage(message, '*');
            } catch(e) {
                // Ignore errors for closed windows
            }
        });
    };

    // Initialize floating controls
    function initFloatingControls() {
        // Floating buttons
        const floatingTopBtn = document.getElementById('floatingTopBtn');
        const floatingCreateGroupBtn = document.getElementById('floatingCreateGroupBtn');
        const floatingColorBtn = document.getElementById('floatingColorBtn');
        
        // Floating toolbar buttons
        const floatingSelectAllBtn = document.getElementById('floatingSelectAllBtn');
        const floatingDeselectAllBtn = document.getElementById('floatingDeselectAllBtn');
        const floatingInvertSelectionBtn = document.getElementById('floatingInvertSelectionBtn');
        const selectionCountDisplay = document.querySelector('.selection-count');
        
        // Floating color picker
        const floatingColorPicker = document.getElementById('floatingColorPicker');
        const closeFloatingPicker = document.querySelector('.close-floating-picker');
        const floatingPaletteColors = document.querySelectorAll('.floating-palette .color-preset');
        
        // Top button functionality
        if (floatingTopBtn) {
            floatingTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        
        // Create group button
        if (floatingCreateGroupBtn) {
            floatingCreateGroupBtn.addEventListener('click', createQuickGroup);
        }
        
        // Color button and picker
        if (floatingColorBtn && floatingColorPicker) {
            floatingColorBtn.addEventListener('click', () => {
                floatingColorPicker.classList.toggle('active');
            });
        }
        
        if (closeFloatingPicker) {
            closeFloatingPicker.addEventListener('click', () => {
                floatingColorPicker.classList.remove('active');
            });
        }
        
        if (floatingPaletteColors) {
            floatingPaletteColors.forEach(color => {
                color.addEventListener('click', () => {
                    const colorValue = color.dataset.color;
                    applyColorToSelectedChannels(colorValue);
                    floatingColorPicker.classList.remove('active');
                });
            });
        }
        
        // Floating toolbar functions
        if (floatingSelectAllBtn) {
            floatingSelectAllBtn.addEventListener('click', selectAllChannels);
        }
        
        if (floatingDeselectAllBtn) {
            floatingDeselectAllBtn.addEventListener('click', deselectAllChannels);
        }
        
        if (floatingInvertSelectionBtn) {
            floatingInvertSelectionBtn.addEventListener('click', invertChannelSelection);
        }
        
        // Update selection count and visibility of floating tools
        function updateSelectionCount() {
            const selectedCount = document.querySelectorAll('.channel-select:checked').length;
            
            if (selectionCountDisplay) {
                selectionCountDisplay.textContent = `${selectedCount} selected`;
            }
            
            // Show/hide based on selection
            const floatingTools = document.getElementById('floatingTools');
            if (floatingTools) {
                floatingTools.style.opacity = selectedCount > 0 ? '1' : '0.5';
            }
        }
        
        // Watch for checkbox changes to update selection count
        document.addEventListener('change', (event) => {
            if (event.target.classList.contains('channel-select')) {
                updateSelectionCount();
            }
        });
        
        // Initial count update
        updateSelectionCount();
        
        // Hide tools when scrolling (after a brief delay)
        let scrollTimer;
        window.addEventListener('scroll', () => {
            const floatingTools = document.getElementById('floatingTools');
            if (floatingTools) {
                floatingTools.style.opacity = '0.2';
                
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    floatingTools.style.opacity = document.querySelectorAll('.channel-select:checked').length > 0 ? '1' : '0.5';
                }, 500);
            }
        });
    }
    
    // Override selectAllChannels to update floating UI
    const originalSelectAllChannels = selectAllChannels;
    selectAllChannels = function() {
        originalSelectAllChannels();
        updateSelectionCount();
    };
    
    // Override deselectAllChannels to update floating UI
    const originalDeselectAllChannels = deselectAllChannels;
    deselectAllChannels = function() {
        originalDeselectAllChannels();
        updateSelectionCount();
    };
    
    // Override invertChannelSelection to update floating UI
    const originalInvertChannelSelection = invertChannelSelection;
    invertChannelSelection = function() {
        originalInvertChannelSelection();
        updateSelectionCount();
    };
    
    // Function to update selection count display
    function updateSelectionCount() {
        const selectedCount = document.querySelectorAll('.channel-select:checked').length;
        const selectionCountDisplay = document.querySelector('.selection-count');
        
        if (selectionCountDisplay) {
            selectionCountDisplay.textContent = `${selectedCount} selected`;
        }
        
        // Show/hide based on selection
        const floatingTools = document.getElementById('floatingTools');
        if (floatingTools) {
            floatingTools.style.opacity = selectedCount > 0 ? '1' : '0.5';
        }
    }

    // Initialize the main view
    showSection(mainControl);
    log('ArtBastard DMX512FTW initialized - the luminous canvas awaits your artistic vision');
    
    // Initialize the status indicators
    updateArtnetStatus(true);
    
    // Load the saved theme and mode
    const savedTheme = localStorage.getItem('dmxTheme') || 'artsnob';
    const savedThemeMode = localStorage.getItem('dmxThemeMode') || 'dark';
    
    // Ensure both HTML and BODY have the data-theme attribute
    document.documentElement.setAttribute('data-theme', savedThemeMode);
    document.body.setAttribute('data-theme', savedThemeMode);
    
    // Global dark mode state should match
    darkMode = savedThemeMode === 'dark';
    
    // Set the theme selectors to match saved theme
    const uiThemeSelectElements = document.querySelectorAll('#uiThemeSelect, #settingsThemeSelect');
    uiThemeSelectElements.forEach(select => {
        if (select) select.value = savedTheme;
    });
    
    // Initialize settings theme toggle if it exists
    const settingsThemeMode = document.getElementById('settingsThemeMode');
    const settingsThemeToggle = document.getElementById('settingsThemeToggle');
    if (settingsThemeMode && settingsThemeToggle) {
        settingsThemeMode.checked = savedThemeMode === 'light';
        settingsThemeToggle.innerHTML = savedThemeMode === 'light' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    
    // Apply the theme
    changeUITheme(savedTheme);
    
    // Initialize floating controls
    initFloatingControls();
});