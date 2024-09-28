const socket = io();

const midiInterfaceSelect = document.getElementById('midiInterface');
const midiMappings = document.getElementById('midiMappings');
const forgetAllMidiButton = document.getElementById('forgetAllMidi');
const oscInputPort = document.getElementById('oscInputPort');
const oscOutputPort = document.getElementById('oscOutputPort');
const oscOutputAddress = document.getElementById('oscOutputAddress');
const saveOscSettingsButton = document.getElementById('saveOscSettings');

socket.on('midiInterfaces', (interfaces) => {
    midiInterfaceSelect.innerHTML = interfaces.map(int => `<option value="${int}">${int}</option>`).join('');
});

midiInterfaceSelect.addEventListener('change', (event) => {
    socket.emit('selectMidiInterface', event.target.value);
});

socket.on('midiInterfaceSelected', (interfaceName) => {
    console.log(`Connected to MIDI interface: ${interfaceName}`);
});

socket.on('midiInterfaceError', (error) => {
    console.error('MIDI interface error:', error);
});

socket.on('midiMappingUpdate', (mappings) => {
    midiMappings.innerHTML = '';
    Object.entries(mappings.channels).forEach(([midiControl, dmxChannel]) => {
        const mappingElement = document.createElement('div');
        mappingElement.textContent = `MIDI Control ${midiControl} -> DMX Channel ${dmxChannel}`;
        midiMappings.appendChild(mappingElement);
    });
    Object.entries(mappings.scenes).forEach(([midiControl, sceneIndex]) => {
        const mappingElement = document.createElement('div');
        mappingElement.textContent = `MIDI Control ${midiControl} -> Scene ${sceneIndex}`;
        midiMappings.appendChild(mappingElement);
    });
});

forgetAllMidiButton.addEventListener('click', () => {
    socket.emit('forgetAllMidiMappings');
});

socket.on('allMidiMappingsForgotten', () => {
    alert('All MIDI mappings have been forgotten');
    midiMappings.innerHTML = '';
});

saveOscSettingsButton.addEventListener('click', () => {
    const settings = {
        inputPort: parseInt(oscInputPort.value),
        outputPort: parseInt(oscOutputPort.value),
        outputAddress: oscOutputAddress.value
    };
    socket.emit('saveOscSettings', settings);
});

socket.on('oscSettingsSaved', () => {
    alert('OSC settings have been saved');
});

// Request initial MIDI interfaces and mappings
socket.emit('getMidiInterfaces');
socket.emit('getMidiMappings');

// Request initial OSC settings
socket.emit('getOscSettings');

socket.on('oscSettings', (settings) => {
    oscInputPort.value = settings.inputPort;
    oscOutputPort.value = settings.outputPort;
    oscOutputAddress.value = settings.outputAddress;
});