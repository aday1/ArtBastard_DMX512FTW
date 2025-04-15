document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.io connection
    const socket = io();

    // DOM Elements
    const statusIndicator = document.getElementById('statusIndicator');
    const statusMessage = document.getElementById('statusMessage');
    const themeToggle = document.getElementById('themeToggle');
    const mainControl = document.getElementById('mainControl');
    const midiOscSetup = document.getElementById('midiOscSetup');
    const fixtureSetup = document.getElementById('fixtureSetup');
    const sceneGallery = document.getElementById('sceneGallery');
    const oscDebug = document.getElementById('oscDebug');
    const misc = document.getElementById('misc');
    const dmxChannelsContainer = document.getElementById('dmxChannels');
    const groupControlsContainer = document.getElementById('groupControls');
    const sceneName = document.getElementById('sceneName');
    const sceneOscAddress = document.getElementById('sceneOscAddress');
    const saveSceneBtn = document.getElementById('saveScene');
    const clearAllScenesBtn = document.getElementById('clearAllScenes');
    const loadSceneSelect = document.getElementById('loadSceneSelect');
    const loadSceneButton = document.getElementById('loadSceneButton');
    const savedScenesList = document.getElementById('savedScenesList');
    const sceneGalleryList = document.getElementById('sceneGalleryList');
    const transitionDuration = document.getElementById('transitionDuration');
    const transitionDurationValue = document.getElementById('transitionDurationValue');
    const sceneTransitionFrom = document.getElementById('sceneTransitionFrom');
    const sceneTransitionTo = document.getElementById('sceneTransitionTo');
    const transitionSlider = document.getElementById('transitionSlider');
    const transitionSliderValue = document.getElementById('transitionSliderValue');
    const autoPilotSceneFrom = document.getElementById('autoPilotSceneFrom');
    const autoPilotSceneTo = document.getElementById('autoPilotSceneTo');
    const autoPilotToggle = document.getElementById('autoPilotToggle');
    const autoPilotSlider = document.getElementById('autoPilotSlider');
    const autoPilotSliderValue = document.getElementById('autoPilotSliderValue');
    const autoPilotDurationDisplay = document.getElementById('autoPilotDurationDisplay');
    const tapButton = document.getElementById('tapButton');
    const bpmDisplay = document.getElementById('bpmDisplay');
    const syncLightsButton = document.getElementById('syncLightsButton');
    const debugOutput = document.getElementById('debugOutput');
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
    
    // Navigation buttons
    const navMain = document.getElementById('navMain');
    const navMidiOsc = document.getElementById('navMidiOsc');
    const navFixture = document.getElementById('navFixture');
    const navScenes = document.getElementById('navScenes');
    const navOscDebug = document.getElementById('navOscDebug');
    const navMisc = document.getElementById('navMisc');

    // Variables
    let dmxChannels = new Array(512).fill(0);
    let oscAssignments = new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`);
    let channelNames = new Array(512).fill('').map((_, i) => `Channel ${i + 1}`);
    let fixtures = [];
    let groups = [];
    let scenes = [];
    let midiMappings = {};
    let currentMidiLearnChannel = null;
    let currentMidiLearnScene = null;
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

    // Event Listeners
    socket.on('connect', () => {
        statusIndicator.classList.add('connected');
        showMessage('Connected to the luminous server', 'success');
    });

    socket.on('disconnect', () => {
        statusIndicator.classList.remove('connected');
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
        const artnetStatus = document.getElementById('artnetStatus');
        if (artnetStatus) {
            artnetStatus.innerHTML = `<p>ArtNet device at ${ip} is <span class="${status === 'alive' ? 'status-alive' : 'status-dead'}">${status}</span></p>`;
        }
    });

    socket.on('artnetDevices', (devices) => {
        const artnetDevices = document.getElementById('artnetDevices');
        if (artnetDevices) {
            artnetDevices.innerHTML = `
                <h3>Discovered ArtNet Entities</h3>
                <div class="device-list">
                    ${devices.length ? devices.map(device => `
                        <div class="device-item">
                            <h4>${device.name || 'Unnamed Device'}</h4>
                            <p>IP: ${device.ip}</p>
                            <p>MAC: ${device.mac}</p>
                            <button class="connect-device" data-ip="${device.ip}">Connect to this entity</button>
                        </div>
                    `).join('') : '<p>No ArtNet devices were found in the ether</p>'}
                </div>
            `;
        }
    });

    // Navigation Event Listeners
    navMain.addEventListener('click', () => showSection(mainControl));
    navMidiOsc.addEventListener('click', () => showSection(midiOscSetup));
    navFixture.addEventListener('click', () => showSection(fixtureSetup));
    navScenes.addEventListener('click', () => showSection(sceneGallery));
    navOscDebug.addEventListener('click', () => showSection(oscDebug));
    navMisc.addEventListener('click', () => showSection(misc));

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

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

    // Functions
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
        if (darkMode) {
            document.documentElement.style.setProperty('--primary-color', '#1a1a2e');
            document.documentElement.style.setProperty('--secondary-color', '#16213e');
            document.documentElement.style.setProperty('--text-color', '#eaeaea');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.style.setProperty('--primary-color', '#f0f8ff');
            document.documentElement.style.setProperty('--secondary-color', '#e6f2ff');
            document.documentElement.style.setProperty('--text-color', '#333333');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        log(`Theme changed to ${darkMode ? 'dark' : 'light'} mode`);
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

    function renderDmxChannels() {
        dmxChannelsContainer.innerHTML = '';
        
        // Create channel groups of 4 for better organization
        for (let i = 0; i < dmxChannels.length; i += 4) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'channel-group';
            
            for (let j = i; j < i + 4 && j < dmxChannels.length; j++) {
                const channelDiv = document.createElement('div');
                channelDiv.className = 'dmx-channel';
                
                // Check if this channel is mapped to a color
                if (channelColors[j]) {
                    channelDiv.style.borderLeft = `3px solid rgb(${channelColors[j]})`;
                }
                
                // Add checkbox for channel selection (used for color application)
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'channel-select';
                checkbox.dataset.channel = j;
                
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.value = channelNames[j];
                nameInput.className = 'channel-name';
                nameInput.dataset.channel = j;
                nameInput.addEventListener('change', (e) => {
                    channelNames[j] = e.target.value;
                    socket.emit('updateChannelName', { channel: j, name: e.target.value });
                });
                
                const label = document.createElement('label');
                label.textContent = `${j + 1}: `;
                label.prepend(checkbox);
                label.appendChild(nameInput);
                
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
                
                const oscInput = document.createElement('input');
                oscInput.type = 'text';
                oscInput.value = oscAssignments[j];
                oscInput.className = 'osc-value';
                oscInput.dataset.channel = j;
                oscInput.addEventListener('change', (e) => {
                    oscAssignments[j] = e.target.value;
                    socket.emit('updateOscAssignment', { channel: j, address: e.target.value });
                });
                
                const midiLearnBtn = document.createElement('button');
                midiLearnBtn.className = 'midi-learn';
                midiLearnBtn.textContent = midiMappings[j] ? 'Mapped' : 'MIDI Learn';
                midiLearnBtn.dataset.channel = j;
                if (midiMappings[j]) {
                    midiLearnBtn.classList.add('mapped');
                }
                midiLearnBtn.addEventListener('click', () => startMidiLearn(j));
                
                channelDiv.appendChild(label);
                channelDiv.appendChild(slider);
                channelDiv.appendChild(valueDisplay);
                channelDiv.appendChild(document.createElement('br'));
                channelDiv.appendChild(document.createElement('label')).textContent = 'OSC:';
                channelDiv.appendChild(oscInput);
                channelDiv.appendChild(midiLearnBtn);
                
                groupDiv.appendChild(channelDiv);
            }
            
            dmxChannelsContainer.appendChild(groupDiv);
        }
        
        log('DMX channels rendered on the canvas');
    }

    function renderFixtures() {
        const fixturesList = document.getElementById('fixturesList');
        if (!fixturesList) return;
        
        fixturesList.innerHTML = '<h3>Existing Fixtures - The Gallery of Light Instruments</h3>';
        
        fixtures.forEach((fixture, index) => {
            const fixtureDiv = document.createElement('div');
            fixtureDiv.className = 'fixture-item';
            
            const fixtureHeader = document.createElement('h4');
            fixtureHeader.textContent = fixture.name;
            
            const fixtureAddress = document.createElement('p');
            fixtureAddress.textContent = `Starting Address: ${fixture.startAddress}`;
            
            const fixtureChannels = document.createElement('div');
            fixtureChannels.className = 'fixture-channels';
            fixtureChannels.innerHTML = '<h5>Channels:</h5>';
            
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
            
            const fixtureControls = document.createElement('div');
            fixtureControls.className = 'fixture-controls';
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => editFixture(index));
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteFixture(index));
            
            fixtureControls.appendChild(editButton);
            fixtureControls.appendChild(deleteButton);
            
            fixtureDiv.appendChild(fixtureHeader);
            fixtureDiv.appendChild(fixtureAddress);
            fixtureDiv.appendChild(fixtureChannels);
            fixtureDiv.appendChild(fixtureControls);
            
            fixturesList.appendChild(fixtureDiv);
        });
        
        log('Fixtures rendered in the composition panel');
    }

    function renderGroups() {
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) return;
        
        groupsList.innerHTML = '<h3>Existing Groups - The Constellations of Light</h3>';
        
        groups.forEach((group, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-item';
            
            const groupHeader = document.createElement('h4');
            groupHeader.textContent = group.name;
            
            const fixturesList = document.createElement('p');
            fixturesList.textContent = `Fixtures: ${group.fixtureIndices.map(idx => fixtures[idx]?.name || 'Unknown').join(', ')}`;
            
            const groupControls = document.createElement('div');
            groupControls.className = 'group-controls';
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => editGroup(index));
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteGroup(index));
            
            groupControls.appendChild(editButton);
            groupControls.appendChild(deleteButton);
            
            groupDiv.appendChild(groupHeader);
            groupDiv.appendChild(fixturesList);
            groupDiv.appendChild(groupControls);
            
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
            groupDiv.className = 'group-control';
            
            const groupHeader = document.createElement('h3');
            groupHeader.textContent = group.name;
            groupDiv.appendChild(groupHeader);
            
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
                
                groupDiv.appendChild(typeDiv);
            });
            
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
            sceneDiv.className = 'scene-item';

            const sceneHeader = document.createElement('h3');
            sceneHeader.textContent = scene.name;

            const sceneAddress = document.createElement('p');
            sceneAddress.textContent = `OSC: ${scene.oscAddress}`;

            const loadButton = document.createElement('button');
            loadButton.innerHTML = '<i class="fas fa-magic"></i> Manifest';
            loadButton.addEventListener('click', () => loadScene(scene.name));

            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i> Revise';
            editButton.addEventListener('click', () => editScene(scene));

            const deleteButton = document.createElement('button');
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

            sceneDiv.appendChild(sceneHeader);
            sceneDiv.appendChild(sceneAddress);
            sceneDiv.appendChild(loadButton);
            sceneDiv.appendChild(editButton);
            sceneDiv.appendChild(deleteButton);
            sceneDiv.appendChild(midiLearnBtn);

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

        if (slider) {
            slider.value = value;
        }

        if (valueDisplay) {
            valueDisplay.textContent = value;
        }

        if (fixtureSlider) {
            fixtureSlider.value = value;
        }

        if (fixtureValueDisplay) {
            fixtureValueDisplay.textContent = value;
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
                showMessage('MIDI learning timed out. Try again.', 'error');
                currentMidiLearnChannel = null;
            }
        }, 10000);

        log(`MIDI learn started for channel ${channel}`);
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
                showMessage('MIDI learning timed out. Try again.', 'error');
                currentMidiLearnScene = null;
            }
        }, 10000);

        log(`MIDI learn started for scene "${sceneName}"`);
    }

    function saveScene() {
        const name = sceneName.value.trim();
        const oscAddress = sceneOscAddress.value.trim();

        if (!name) {
            showMessage('Please bestow a title upon your masterpiece', 'error');
            return;
        }

        if (!oscAddress) {
            showMessage('Please assign an OSC address to your creation', 'error');
            return;
        }

        socket.emit('saveScene', { name, oscAddress, state: dmxChannels });
        log(`Scene "${name}" saved with OSC address "${oscAddress}"`);
    }

    function loadScene(name) {
        socket.emit('loadScene', { name });
        log(`Loading scene "${name}" onto the canvas`);
    }

    function loadSelectedScene() {
        const selectedScene = loadSceneSelect.value;
        if (selectedScene) {
            loadScene(selectedScene);
        } else {
            showMessage('Please select a scene to materialize', 'error');
        }
    }

    function editScene(scene) {
        sceneName.value = scene.name;
        sceneOscAddress.value = scene.oscAddress;
        showMessage(`Scene "${scene.name}" ready for revision`, 'success');
    }

    function deleteScene(name) {
        if (confirm(`Are you certain you wish to erase "${name}" from existence?`)) {
            socket.emit('deleteScene', { name });
            scenes = scenes.filter(scene => scene.name !== name);
            updateSceneSelects();
            renderSceneGallery();
            showMessage(`Scene "${name}" has been expunged from the gallery`, 'success');
            log(`Scene "${name}" deleted`);
        }
    }

    function clearAllScenes() {
        if (confirm('Are you absolutely certain you wish to purge the entire gallery? This action cannot be undone.')) {
            socket.emit('clearAllScenes');
            scenes = [];
            updateSceneSelects();
            renderSceneGallery();
            showMessage('The gallery has been purged of all scenes', 'success');
            log('All scenes cleared from the gallery');
        }
    }

    function updateTransitionDuration() {
        const duration = transitionDuration.value;
        transitionDurationValue.textContent = `${duration} s`;
        log(`Transition duration set to ${duration} seconds`);
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
                
                log(`Transition at ${progress}% between "${sceneTransition.fromScene}" and "${sceneTransition.toScene}"`);
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
                showMessage('Please select both origin and destination scenes', 'error');
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
            
            log(`Auto pilot engaged between "${autoPilot.fromScene}" and "${autoPilot.toScene}" with ${duration/1000}s duration`);
            showMessage('Autonomous expression engaged', 'success');
        } else {
            // Stop auto pilot
            if (autoPilotInterval) {
                clearInterval(autoPilotInterval);
                autoPilotInterval = null;
            }
            
            log('Auto pilot disengaged');
            showMessage('Autonomous expression halted', 'success');
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
            log(`BPM set to ${currentBPM}`);
        }
        
        // Visual feedback
        tapButton.classList.add('tapped');
        setTimeout(() => {
            tapButton.classList.remove('tapped');
        }, 100);
    }

    function syncLightsToBPM() {
        if (currentBPM === 0) {
            showMessage('Please establish a rhythmic pulse first', 'error');
            return;
        }
        
        showMessage(`Synchronizing luminescence to ${currentBPM} BPM`, 'success');
        log(`Synchronizing lights to ${currentBPM} BPM`);
        
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
        
        colorPickerModal.style.display = 'block';
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
        
        log(`Custom color rgb(${r},${g},${b}) created and applied`);
    }

    function applyColorToSelectedChannels(colorString) {
        const selectedChannels = document.querySelectorAll('.channel-select:checked');
        
        if (selectedChannels.length === 0) {
            showMessage('Please select channels to apply color to', 'error');
            return;
        }
        
        // If this is a standard RGB color format, we need at least 3 channels
        const [r, g, b] = colorString.split(',').map(Number);
        
        if (selectedChannels.length < 3 && r !== undefined && g !== undefined && b !== undefined) {
            showMessage('Please select at least 3 channels for RGB color', 'error');
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
        
        log(`Applied color rgb(${r},${g},${b}) to ${selectedChannels.length} channels`);
        showMessage(`Color applied to ${selectedChannels.length} channels`, 'success');
    }

    function editFixture(index) {
        // This would open a form to edit the fixture
        log(`Editing fixture with index ${index}`);
    }

    function deleteFixture(index) {
        if (confirm(`Are you certain you wish to remove this fixture from your composition?`)) {
            socket.emit('deleteFixture', { index });
            fixtures = fixtures.filter((_, i) => i !== index);
            renderFixtures();
            renderGroups(); // Re-render groups as they might reference this fixture
            showMessage('Fixture removed from the composition', 'success');
            log(`Fixture with index ${index} deleted`);
        }
    }

    function editGroup(index) {
        // This would open a form to edit the group
        log(`Editing group with index ${index}`);
    }

    function deleteGroup(index) {
        if (confirm(`Are you certain you wish to dissolve this collective?`)) {
            socket.emit('deleteGroup', { index });
            groups = groups.filter((_, i) => i !== index);
            renderGroups();
            showMessage('Group dissolved from the collective', 'success');
            log(`Group with index ${index} deleted`);
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

    // Initialize the main view
    showSection(mainControl);
    log('ArtBastard DMX512FTW initialized - the canvas awaits your vision');
});