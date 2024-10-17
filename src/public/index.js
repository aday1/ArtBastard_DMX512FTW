const socket = io();

try {
    console.log("Starting initialization...");

    // DOM elements
    const dmxChannels = document.getElementById('dmxChannels');
    const artnetDiagnostics = document.getElementById('artnetDiagnostics');
    const searchArtnetDevicesButton = document.getElementById('searchArtnetDevices');
    const artnetDevices = document.getElementById('artnetDevices');
    const sceneName = document.getElementById('sceneName');
    const sceneOscAddress = document.getElementById('sceneOscAddress');
    const saveSceneButton = document.getElementById('saveScene');
    const clearAllScenesButton = document.getElementById('clearAllScenes');
    const transitionDuration = document.getElementById('transitionDuration');
    const transitionDurationValue = document.getElementById('transitionDurationValue');
    const debugOutput = document.getElementById('debugOutput');
    const sceneTransitionFrom = document.getElementById('sceneTransitionFrom');
    const sceneTransitionTo = document.getElementById('sceneTransitionTo');
    const transitionSlider = document.getElementById('transitionSlider');
    const autoPilotToggle = document.getElementById('autoPilotToggle');
    const autoPilotSceneFrom = document.getElementById('autoPilotSceneFrom');
    const autoPilotSceneTo = document.getElementById('autoPilotSceneTo');
    const autoPilotSlider = document.getElementById('autoPilotSlider');
    const autoPilotSliderValue = document.getElementById('autoPilotSliderValue');
    const loadSceneSelect = document.getElementById('loadSceneSelect');
    const loadSceneButton = document.getElementById('loadSceneButton');
    const savedScenesList = document.getElementById('savedScenesList');
    const autoPilotDurationDisplay = document.getElementById('autoPilotDurationDisplay');
    const tapButton = document.getElementById('tapButton');
    const bpmDisplay = document.getElementById('bpmDisplay');

    // Navigation buttons
    const navMain = document.getElementById('navMain');
    const navMidiOsc = document.getElementById('navMidiOsc');
    const navFixture = document.getElementById('navFixture');
    const navOscDebug = document.getElementById('navOscDebug');
    const navMisc = document.getElementById('navMisc');

    // Content areas
    const mainControl = document.getElementById('mainControl');
    const midiOscSetup = document.getElementById('midiOscSetup');
    const fixtureSetup = document.getElementById('fixtureSetup');
    const oscDebug = document.getElementById('oscDebug');
    const misc = document.getElementById('misc');

    console.log("DOM elements initialized");

    let midiLearningChannel = null;
    let midiLearningScene = null;
    let scenes = [];
    let autoPilotInterval = null;
    let currentSceneState = {};
    let lastTapTime = 0;
    let tapCount = 0;
    let bpm = 0;

    function log(message) {
        console.log(message);
        if (debugOutput) {
            debugOutput.textContent += message + '\n';
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
    }

    // Navigation functionality
    function showSection(sectionToShow) {
        [mainControl, midiOscSetup, fixtureSetup, oscDebug, misc].forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });
        if (sectionToShow) {
            sectionToShow.style.display = 'block';
        }
    }

    if (navMain) navMain.addEventListener('click', () => showSection(mainControl));
    if (navMidiOsc) navMidiOsc.addEventListener('click', () => showSection(midiOscSetup));
    if (navFixture) navFixture.addEventListener('click', () => showSection(fixtureSetup));
    if (navOscDebug) navOscDebug.addEventListener('click', () => showSection(oscDebug));
    if (navMisc) navMisc.addEventListener('click', () => showSection(misc));

    // Initialize DMX channels
    console.log("Initializing DMX channels...");
    const dmxChannelCount = 512;
    if (dmxChannels) {
        for (let i = 0; i < dmxChannelCount; i++) {
            const channelElement = document.createElement('div');
            channelElement.className = 'dmx-channel';
            channelElement.innerHTML = `
                <input type="range" min="0" max="255" value="0" class="dmx-channel-slider" id="dmx-slider-${i}">
                <div class="dmx-channel-label" id="dmx-label-${i}">CH ${i + 1}</div>
                <div class="dmx-channel-value" id="dmx-value-${i}">0</div>
                <input type="text" class="dmx-channel-name" id="dmx-name-${i}" placeholder="Name">
                <button class="update-name-btn" id="update-name-${i}">Update Name</button>
                <input type="text" class="dmx-channel-osc" id="dmx-osc-${i}" placeholder="OSC Address">
                <button class="update-osc-btn" id="update-osc-${i}">Update OSC</button>
                <button class="midi-learn-btn" id="midi-learn-${i}">Learn</button>
                <button class="midi-forget-btn" id="midi-forget-${i}">Forget</button>
            `;
            dmxChannels.appendChild(channelElement);

            const slider = channelElement.querySelector('.dmx-channel-slider');
            const valueDisplay = channelElement.querySelector('.dmx-channel-value');
            const nameInput = channelElement.querySelector('.dmx-channel-name');
            const updateNameBtn = channelElement.querySelector('.update-name-btn');
            const oscInput = channelElement.querySelector('.dmx-channel-osc');
            const updateOscBtn = channelElement.querySelector('.update-osc-btn');
            const learnBtn = channelElement.querySelector('.midi-learn-btn');
            const forgetBtn = channelElement.querySelector('.midi-forget-btn');
            
            slider.addEventListener('input', (event) => {
                const value = parseInt(event.target.value);
                updateDmxChannel(i, value);
                valueDisplay.textContent = value;
                socket.emit('setDmxChannel', { channel: i, value: value });
                log(`DMX channel ${i + 1} set to ${value}`);
                currentSceneState[i] = value;
            });

            updateNameBtn.addEventListener('click', () => {
                const name = nameInput.value;
                socket.emit('updateChannelName', { channel: i, name: name });
                log(`Name for channel ${i + 1} updated to ${name}`);
            });

            updateOscBtn.addEventListener('click', () => {
                const oscAddress = oscInput.value;
                socket.emit('updateOscAssignment', { channel: i, oscAddress: oscAddress });
                log(`OSC assignment for channel ${i + 1} updated to ${oscAddress}`);
            });

            learnBtn.addEventListener('click', () => {
                midiLearningChannel = i;
                socket.emit('startMidiLearn', { channel: i });
                log(`MIDI learn started for channel ${i + 1}`);
            });

            forgetBtn.addEventListener('click', () => {
                socket.emit('forgetMidiMapping', { channel: i });
                log(`MIDI mapping forgotten for channel ${i + 1}`);
            });
        }
    } else {
        console.error("DMX channels container not found");
    }

    console.log("DMX channels initialized");

    // Scene transition functionality
    if (transitionSlider) {
        transitionSlider.addEventListener('input', () => {
            const fromScene = sceneTransitionFrom.value;
            const toScene = sceneTransitionTo.value;
            const progress = transitionSlider.value / 100;
            socket.emit('transitionScenes', { fromScene, toScene, progress });
        });
    } else {
        console.error("Transition slider not found");
    }

    // Auto Pilot functionality
    if (autoPilotToggle && transitionDuration && autoPilotSlider) {
        autoPilotToggle.addEventListener('change', () => {
            if (autoPilotToggle.checked) {
                const fromScene = autoPilotSceneFrom.value;
                const toScene = autoPilotSceneTo.value;
                const duration = parseInt(transitionDuration.value) * 1000; // Convert to milliseconds
                startAutoPilot(fromScene, toScene, duration);
            } else {
                stopAutoPilot();
            }
        });

        transitionDuration.addEventListener('input', () => {
            updateAutoPilotDurationDisplay();
        });

        autoPilotSlider.addEventListener('input', () => {
            const progress = autoPilotSlider.value / 100;
            autoPilotSliderValue.textContent = `${autoPilotSlider.value}%`;
            const fromScene = autoPilotSceneFrom.value;
            const toScene = autoPilotSceneTo.value;
            socket.emit('transitionScenes', { fromScene, toScene, progress });
        });

        updateAutoPilotDurationDisplay();
    } else {
        console.error("Auto Pilot toggle, transition duration, or Auto Pilot slider not found");
    }

    function updateAutoPilotDurationDisplay() {
        if (autoPilotDurationDisplay && transitionDuration) {
            const duration = parseInt(transitionDuration.value);
            autoPilotDurationDisplay.textContent = `Duration: ${duration} s`;
        }
    }

    function startAutoPilot(fromScene, toScene, duration) {
        if (autoPilotInterval) clearInterval(autoPilotInterval);
        let progress = 0;
        const step = 1000 / duration; // Calculate step based on duration
        autoPilotInterval = setInterval(() => {
            progress = (progress + step) % 1;
            socket.emit('transitionScenes', { fromScene, toScene, progress });
            if (autoPilotSlider) autoPilotSlider.value = progress * 100;
            if (autoPilotSliderValue) autoPilotSliderValue.textContent = `${Math.round(progress * 100)}%`;
            if (progress >= 0.99) {
                // Swap scenes when reaching the end
                [fromScene, toScene] = [toScene, fromScene];
                if (autoPilotSceneFrom) autoPilotSceneFrom.value = fromScene;
                if (autoPilotSceneTo) autoPilotSceneTo.value = toScene;
            }
        }, 1000 / 30); // Update 30 times per second
    }

    function stopAutoPilot() {
        if (autoPilotInterval) {
            clearInterval(autoPilotInterval);
            autoPilotInterval = null;
        }
    }

    // BPM Counter functionality
    if (tapButton && bpmDisplay) {
        tapButton.addEventListener('click', () => {
            const currentTime = Date.now();
            if (lastTapTime !== 0) {
                const timeDiff = currentTime - lastTapTime;
                bpm = Math.round(60000 / timeDiff);
                tapCount++;
                if (tapCount >= 4) {
                    bpmDisplay.textContent = `BPM: ${bpm}`;
                }
            } else {
                tapCount = 1;
            }
            lastTapTime = currentTime;

            // Reset tap count after 2 seconds of inactivity
            setTimeout(() => {
                if (Date.now() - lastTapTime >= 2000) {
                    tapCount = 0;
                    lastTapTime = 0;
                }
            }, 2000);
        });
    } else {
        console.error("TAP button or BPM display not found");
    }

    // Socket event handlers
    socket.on('dmxUpdate', ({ channel, value }) => {
        updateDmxChannel(channel, value);
        log(`DMX channel ${channel + 1} updated to ${value}`);
    });

    socket.on('oscAssignmentUpdated', ({ channel, oscAddress }) => {
        updateOscAssignment(channel, oscAddress);
        log(`OSC assignment for channel ${channel + 1} updated to ${oscAddress}`);
    });

    socket.on('channelNameUpdated', ({ channel, name }) => {
        updateChannelName(channel, name);
        log(`Name for channel ${channel + 1} updated to ${name}`);
    });

    socket.on('midiMappingLearned', ({ channel, mapping }) => {
        log(`MIDI mapping learned for channel ${channel + 1}: ${JSON.stringify(mapping)}`);
        midiLearningChannel = null;
    });

    socket.on('midiMappingForgotten', ({ channel }) => {
        log(`MIDI mapping forgotten for channel ${channel + 1}`);
    });

    socket.on('initialState', (state) => {
        state.dmxChannels.forEach((value, index) => {
            updateDmxChannel(index, value);
        });
        state.oscAssignments.forEach((oscAddress, index) => {
            updateOscAssignment(index, oscAddress);
        });
        state.channelNames.forEach((name, index) => {
            updateChannelName(index, name);
        });
        log('Initial state loaded');
    });

    socket.on('sceneList', (sceneList) => {
        scenes = sceneList;
        updateSceneDropdowns();
        updateLoadSceneDropdown();
        updateSavedScenesList();
        log(`Scene list updated: ${JSON.stringify(scenes)}`);
    });

    function updateDmxChannel(channel, value) {
        const slider = document.getElementById(`dmx-slider-${channel}`);
        const valueDisplay = document.getElementById(`dmx-value-${channel}`);
        if (slider && valueDisplay) {
            slider.value = value;
            valueDisplay.textContent = value;
        }
        currentSceneState[channel] = value;
    }

    function updateOscAssignment(channel, oscAddress) {
        const oscInput = document.getElementById(`dmx-osc-${channel}`);
        if (oscInput) {
            oscInput.value = oscAddress;
        }
    }

    function updateChannelName(channel, name) {
        const nameInput = document.getElementById(`dmx-name-${channel}`);
        const labelElement = document.getElementById(`dmx-label-${channel}`);
        if (nameInput && labelElement) {
            nameInput.value = name.replace(`CH ${channel + 1} `, '');
            labelElement.textContent = name;
        }
    }

    function updateSceneDropdowns() {
        [sceneTransitionFrom, sceneTransitionTo, autoPilotSceneFrom, autoPilotSceneTo].forEach(dropdown => {
            if (dropdown) {
                dropdown.innerHTML = '';
                scenes.forEach(scene => {
                    const option = document.createElement('option');
                    option.value = scene.name;
                    option.textContent = scene.name;
                    dropdown.appendChild(option);
                });
            }
        });
    }

    function updateLoadSceneDropdown() {
        if (loadSceneSelect) {
            loadSceneSelect.innerHTML = '';
            scenes.forEach(scene => {
                const option = document.createElement('option');
                option.value = scene.name;
                option.textContent = scene.name;
                loadSceneSelect.appendChild(option);
            });
        }
    }

    function updateSavedScenesList() {
        if (savedScenesList) {
            savedScenesList.innerHTML = '';
            scenes.forEach(scene => {
                const sceneElement = document.createElement('div');
                sceneElement.className = 'saved-scene';
                
                const sceneButton = document.createElement('button');
                sceneButton.textContent = scene.name;
                sceneButton.addEventListener('click', () => loadScene(scene.name));
                sceneElement.appendChild(sceneButton);
                
                const midiLearnButton = document.createElement('button');
                midiLearnButton.textContent = 'MIDI Learn';
                midiLearnButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    startMidiLearnForScene(scene.name);
                });
                sceneElement.appendChild(midiLearnButton);

                savedScenesList.appendChild(sceneElement);
            });
        }
    }

    function loadScene(sceneName) {
        socket.emit('loadScene', { name: sceneName });
        log(`Loading scene ${sceneName}...`);
    }

    function startMidiLearnForScene(sceneName) {
        midiLearningScene = sceneName;
        socket.emit('startMidiLearnForScene', { sceneName });
        log(`MIDI learn started for scene: ${sceneName}`);
    }

    // Add event listeners for saving and loading scenes
    if (saveSceneButton) {
        saveSceneButton.addEventListener('click', () => {
            const name = sceneName.value.trim();
            const oscAddress = sceneOscAddress.value.trim();
            if (name) {
                socket.emit('saveScene', { name, oscAddress, state: currentSceneState });
                log(`Saving scene: ${name} with OSC Address: ${oscAddress}`);
            } else {
                alert('Please enter a scene name');
            }
        });
    }

    if (clearAllScenesButton) {
        clearAllScenesButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all scenes?')) {
                socket.emit('clearAllScenes');
                log('Clearing all scenes');
            }
        });
    }

    if (loadSceneButton) {
        loadSceneButton.addEventListener('click', () => {
            const selectedScene = loadSceneSelect.value;
            if (selectedScene) {
                loadScene(selectedScene);
            } else {
                alert('Please select a scene to load');
            }
        });
    }

    // Handle scene saved event
    socket.on('sceneSaved', (sceneName) => {
        log(`Scene saved: ${sceneName}`);
        socket.emit('getSceneList');  // Request updated scene list
        alert(`Scene "${sceneName}" saved successfully!`);
    });

    // Handle clear all scenes event
    socket.on('allScenesCleared', () => {
        log('All scenes cleared');
        scenes = [];
        updateSceneDropdowns();
        updateLoadSceneDropdown();
        updateSavedScenesList();
    });

    // Handle MIDI learned for scene event
    socket.on('midiLearnedForScene', ({ sceneName, mapping }) => {
        log(`MIDI mapping learned for scene ${sceneName}: ${JSON.stringify(mapping)}`);
        midiLearningScene = null;
    });

    // Handle scene loaded event
    socket.on('sceneLoaded', ({ name, channelValues }) => {
        log(`Scene ${name} loaded successfully`);
        channelValues.forEach((value, index) => {
            updateDmxChannel(index, value);
        });
    });

    // Handle scene load error
    socket.on('sceneLoadError', ({ name, error }) => {
        log(`Error loading scene ${name}: ${error}`);
        alert(`Failed to load scene ${name}: ${error}`);
    });

    // Request initial data
    socket.emit('getAllDmxChannels');
    socket.emit('getAllDmxChannelNames');
    socket.emit('getSceneList');
    socket.emit('getArtnetDiagnostics');

    // Show main control section by default
    showSection(mainControl);

    log('LaserTime Web Interface initialized');
    console.log("Initialization complete");

} catch (error) {
    console.error("An error occurred during initialization:", error);
    alert("An error occurred during initialization. Please check the console for details.");
}
