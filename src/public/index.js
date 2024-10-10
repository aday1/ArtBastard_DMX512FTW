const socket = io();

// DOM elements
const dmxChannels = document.getElementById('dmxChannels');
const artnetDiagnostics = document.getElementById('artnetDiagnostics');
const searchArtnetDevicesButton = document.getElementById('searchArtnetDevices');
const artnetDevices = document.getElementById('artnetDevices');
const sceneButtons = document.getElementById('sceneButtons');
const sceneName = document.getElementById('sceneName');
const saveSceneButton = document.getElementById('saveScene');
const clearAllScenesButton = document.getElementById('clearAllScenes');
const transitionDuration = document.getElementById('transitionDuration');
const transitionDurationValue = document.getElementById('transitionDurationValue');
const debugOutput = document.getElementById('debugOutput');

let midiLearningChannel = null;
let midiLearningScene = null;

function log(message) {
    console.log(message);
    debugOutput.textContent += message + '\n';
    debugOutput.scrollTop = debugOutput.scrollHeight;
}

function generateOscAddress(channelIndex, channelName) {
    const name = channelName.trim() || `UNKNOWN_NAME/VALUECH${channelIndex}`;
    return `FIXTURE/${name}`;
}

// Initialize DMX channels
const dmxChannelCount = 512;
for (let i = 0; i < dmxChannelCount; i++) {
    const channelElement = document.createElement('div');
    channelElement.className = 'dmx-channel';
    channelElement.innerHTML = `
        <input type="range" min="0" max="255" value="0" class="dmx-channel-slider" id="dmx-slider-${i}">
        <div class="dmx-channel-label">CH ${i + 1}</div>
        <div class="dmx-channel-value" id="dmx-value-${i}">0</div>
        <input type="text" class="dmx-channel-name" id="dmx-name-${i}" placeholder="Name">
        <input type="text" class="dmx-channel-osc" id="dmx-osc-${i}" placeholder="OSC Address" readonly>
        <button class="midi-learn-btn" id="midi-learn-${i}">Learn</button>
        <button class="midi-forget-btn" id="midi-forget-${i}">Forget</button>
    `;
    dmxChannels.appendChild(channelElement);

    const slider = channelElement.querySelector('.dmx-channel-slider');
    const valueDisplay = channelElement.querySelector('.dmx-channel-value');
    const nameInput = channelElement.querySelector('.dmx-channel-name');
    const oscInput = channelElement.querySelector('.dmx-channel-osc');
    const learnBtn = channelElement.querySelector('.midi-learn-btn');
    const forgetBtn = channelElement.querySelector('.midi-forget-btn');
    
    slider.addEventListener('input', (event) => {
        const value = parseInt(event.target.value);
        updateDmxChannel(i, value);
        valueDisplay.textContent = value;
        socket.emit('setDmxChannel', { channel: i, value: value });
        log(`DMX channel ${i + 1} set to ${value}`);
    });

    // ... (keep other event listeners for nameInput, learnBtn, forgetBtn)
}

saveSceneButton.addEventListener('click', () => {
    const name = sceneName.value.trim();
    if (name) {
        socket.emit('saveScene', name);
        sceneName.value = '';
        log(`Saving scene: ${name}`);
    } else {
        alert('Please enter a scene name');
    }
});

clearAllScenesButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all scenes? This action cannot be undone.')) {
        socket.emit('clearAllScenes');
        log('Clearing all scenes');
    }
});

function updateDmxChannel(channel, value) {
    const slider = document.getElementById(`dmx-slider-${channel}`);
    const valueDisplay = document.getElementById(`dmx-value-${channel}`);
    if (slider && valueDisplay) {
        slider.value = value;
        valueDisplay.textContent = value;
    }
}

function createSceneButton(scene, index) {
    const sceneContainer = document.createElement('div');
    sceneContainer.className = 'scene-container';

    const button = document.createElement('button');
    button.textContent = scene.name;
    button.className = 'scene-button';
    button.addEventListener('click', () => {
        const duration = parseInt(transitionDuration.value);
        socket.emit('loadScene', { name: scene.name, duration });
        log(`Loading scene: ${scene.name}, duration: ${duration}ms`);
    });

    // ... (keep other elements like learnBtn, forgetBtn, oscAddress)

    sceneContainer.appendChild(button);
    // ... (append other elements)

    sceneButtons.appendChild(sceneContainer);
}

// Socket event handlers
socket.on('dmxUpdate', ({ channel, value }) => {
    updateDmxChannel(channel, value);
    log(`DMX channel ${channel + 1} updated to ${value}`);
});

socket.on('sceneList', (scenes) => {
    sceneButtons.innerHTML = '';
    scenes.forEach((scene, index) => createSceneButton(scene, index));
    log(`Scene list updated with ${scenes.length} scenes`);
});

socket.on('sceneAdded', (scene) => {
    createSceneButton(scene, sceneButtons.children.length);
    log(`New scene "${scene.name}" added`);
});

socket.on('sceneLoaded', ({ name, duration }) => {
    log(`Scene "${name}" loaded with duration ${duration}ms`);
});

socket.on('scenesCleared', () => {
    sceneButtons.innerHTML = '';
    log('All scenes have been cleared');
});

// ... (keep other socket event handlers)

// Navigation
document.getElementById('navMain').addEventListener('click', () => showSection('mainControl'));
document.getElementById('navMidiOsc').addEventListener('click', () => showSection('midiOscSetup'));
document.getElementById('navFixture').addEventListener('click', () => showSection('fixtureSetup'));
document.getElementById('navOscDebug').addEventListener('click', () => showSection('oscDebug'));
document.getElementById('navMisc').addEventListener('click', () => showSection('misc'));
document.getElementById('openScenesWindow').addEventListener('click', openScenesWindow);

function showSection(sectionId) {
    ['mainControl', 'midiOscSetup', 'fixtureSetup', 'oscDebug', 'misc'].forEach(id => {
        document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
    });
    log(`Showing section: ${sectionId}`);
}

function openScenesWindow() {
    window.open('scenes.html', 'ScenesWindow', 'width=400,height=600');
    log('Scenes window opened');
}

// Request initial data
socket.emit('getAllDmxChannels');
socket.emit('getAllDmxChannelNames');
socket.emit('getSceneList');
socket.emit('getArtnetDiagnostics');

log('LaserTime Web Interface initialized');
