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

function log(message) {
    console.log(message);
    debugOutput.textContent += message + '\n';
    debugOutput.scrollTop = debugOutput.scrollHeight;
}

// Initialize DMX channels
const dmxChannelCount = 512;
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

// ... (keep other existing code)

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

function updateDmxChannel(channel, value) {
    const slider = document.getElementById(`dmx-slider-${channel}`);
    const valueDisplay = document.getElementById(`dmx-value-${channel}`);
    if (slider && valueDisplay) {
        slider.value = value;
        valueDisplay.textContent = value;
    }
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

// ... (keep other existing code)

// Request initial data
socket.emit('getAllDmxChannels');
socket.emit('getAllDmxChannelNames');
socket.emit('getSceneList');
socket.emit('getArtnetDiagnostics');

log('LaserTime Web Interface initialized');
