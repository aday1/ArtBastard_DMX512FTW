const socket = io();

const dmxChannels = document.getElementById('dmxChannels');
const artnetDiagnostics = document.getElementById('artnetDiagnostics');
const searchArtnetDevicesButton = document.getElementById('searchArtnetDevices');
const artnetDevices = document.getElementById('artnetDevices');
const sceneButtons = document.getElementById('sceneButtons');
const sceneName = document.getElementById('sceneName');
const saveSceneButton = document.getElementById('saveScene');
const transitionDuration = document.getElementById('transitionDuration');
const transitionDurationValue = document.getElementById('transitionDurationValue');
const forgetAllMidiButton = document.getElementById('forgetAllMidi');

let midiLearningChannel = null;
let midiLearningScene = null;

function generateOscAddress(channelIndex, channelName) {
    const name = channelName.trim() || `UNKNOWN_NAME/VALUECH${channelIndex}`;
    return `FIXTURE/${name}`;
}

function generateSceneOscAddress(sceneIndex) {
    return `SCENE/${sceneIndex}`;
}

// Initialize DMX channels
const dmxChannelCount = 512;
for (let i = 0; i < dmxChannelCount; i++) {
    const channelElement = document.createElement('div');
    channelElement.className = 'dmx-channel';
    channelElement.innerHTML = `
        <input type="range" min="0" max="255" value="0" class="dmx-channel-slider" id="dmx-slider-${i}">
        <div class="dmx-channel-label">CH ${i}</div>
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
    });

    nameInput.addEventListener('change', (event) => {
        const newName = event.target.value;
        socket.emit('setDmxChannelName', { channel: i, name: newName });
        const newOscAddress = generateOscAddress(i, newName);
        oscInput.value = newOscAddress;
        socket.emit('setOscAddress', { channel: i, address: newOscAddress });
    });

    learnBtn.addEventListener('click', () => {
        if (midiLearningChannel !== null) {
            document.getElementById(`midi-learn-${midiLearningChannel}`).classList.remove('midi-learning');
        }
        midiLearningChannel = i;
        midiLearningScene = null;
        learnBtn.classList.add('midi-learning');
        socket.emit('startMidiLearn', { type: 'channel', index: i });
    });

    forgetBtn.addEventListener('click', () => {
        socket.emit('forgetMidiMapping', { type: 'channel', index: i });
    });

    // Set initial OSC address
    const initialOscAddress = generateOscAddress(i, '');
    oscInput.value = initialOscAddress;
    socket.emit('setOscAddress', { channel: i, address: initialOscAddress });
}

searchArtnetDevicesButton.addEventListener('click', () => {
    socket.emit('searchArtnetDevices');
});

saveSceneButton.addEventListener('click', () => {
    const name = sceneName.value.trim();
    if (name) {
        socket.emit('saveScene', name);
        sceneName.value = '';
    } else {
        alert('Please enter a scene name');
    }
});

transitionDuration.addEventListener('input', (event) => {
    transitionDurationValue.textContent = `${event.target.value} ms`;
});

forgetAllMidiButton.addEventListener('click', () => {
    socket.emit('forgetAllMidiMappings');
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
    });

    const learnBtn = document.createElement('button');
    learnBtn.textContent = 'Learn';
    learnBtn.className = 'midi-learn-btn';
    learnBtn.addEventListener('click', () => {
        if (midiLearningScene !== null) {
            document.getElementById(`scene-learn-${midiLearningScene}`).classList.remove('midi-learning');
        }
        midiLearningScene = index;
        midiLearningChannel = null;
        learnBtn.classList.add('midi-learning');
        socket.emit('startMidiLearn', { type: 'scene', index: index });
    });
    learnBtn.id = `scene-learn-${index}`;

    const forgetBtn = document.createElement('button');
    forgetBtn.textContent = 'Forget';
    forgetBtn.className = 'midi-forget-btn';
    forgetBtn.addEventListener('click', () => {
        socket.emit('forgetMidiMapping', { type: 'scene', index: index });
    });

    const oscAddress = document.createElement('span');
    oscAddress.textContent = scene.oscAddress;
    oscAddress.className = 'scene-osc-address';

    sceneContainer.appendChild(button);
    sceneContainer.appendChild(learnBtn);
    sceneContainer.appendChild(forgetBtn);
    sceneContainer.appendChild(oscAddress);

    sceneButtons.appendChild(sceneContainer);
}

socket.on('dmxUpdate', ({ channel, value }) => {
    updateDmxChannel(channel, value);
});

socket.on('allDmxChannels', (channels) => {
    channels.forEach((value, index) => {
        updateDmxChannel(index, value);
    });
});

socket.on('allDmxChannelNames', (names) => {
    names.forEach((name, index) => {
        const nameInput = document.getElementById(`dmx-name-${index}`);
        const oscInput = document.getElementById(`dmx-osc-${index}`);
        if (nameInput && oscInput) {
            nameInput.value = name;
            oscInput.value = generateOscAddress(index, name);
        }
    });
});

socket.on('dmxChannelNameUpdate', ({ channel, name }) => {
    const nameInput = document.getElementById(`dmx-name-${channel}`);
    const oscInput = document.getElementById(`dmx-osc-${channel}`);
    if (nameInput && oscInput) {
        nameInput.value = name;
        oscInput.value = generateOscAddress(channel, name);
    }
});

socket.on('artnetDiagnostics', (data) => {
    const diagnosticElement = document.createElement('div');
    diagnosticElement.textContent = `Address: ${data.address}, Universe: ${data.universe}, Network Interface: ${data.interface}, Signal: ${data.signal}`;
    artnetDiagnostics.appendChild(diagnosticElement);
    artnetDiagnostics.scrollTop = artnetDiagnostics.scrollHeight;
});

socket.on('artnetDevicesFound', (devices) => {
    artnetDevices.innerHTML = '';
    devices.forEach(device => {
        const deviceElement = document.createElement('div');
        deviceElement.textContent = `IP: ${device.ip}, MAC: ${device.mac}, Name: ${device.name}`;
        artnetDevices.appendChild(deviceElement);
    });
});

socket.on('sceneList', (scenes) => {
    sceneButtons.innerHTML = '';
    scenes.forEach((scene, index) => createSceneButton(scene, index));
});

socket.on('sceneAdded', (scene) => {
    createSceneButton(scene, sceneButtons.children.length);
});

socket.on('midiLearnComplete', ({ type, index, midiControl }) => {
    if (type === 'channel') {
        if (midiLearningChannel !== null) {
            document.getElementById(`midi-learn-${midiLearningChannel}`).classList.remove('midi-learning');
        }
        midiLearningChannel = null;
    } else if (type === 'scene') {
        if (midiLearningScene !== null) {
            document.getElementById(`scene-learn-${midiLearningScene}`).classList.remove('midi-learning');
        }
        midiLearningScene = null;
    }
    alert(`MIDI control ${midiControl} mapped to ${type} ${index}`);
});

socket.on('midiMappingForgotten', ({ type, index }) => {
    alert(`MIDI mapping for ${type} ${index} has been forgotten`);
});

socket.on('allMidiMappingsForgotten', () => {
    alert('All MIDI mappings have been forgotten');
});

// Request initial data
socket.emit('getAllDmxChannels');
socket.emit('getAllDmxChannelNames');
socket.emit('getSceneList');
socket.emit('getArtnetDiagnostics');