const socket = io();

const midiInterfaceSelect = document.getElementById('midiInterface');
const midiMessages = document.getElementById('midiMessages');
const midiMappings = document.getElementById('midiMappings');
const forgetAllMidiButton = document.getElementById('forgetAllMidi');

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

socket.on('midiMessage', (msg) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = `Controller: ${msg.controller}, Value: ${msg.value}`;
    midiMessages.appendChild(messageElement);
    midiMessages.scrollTop = midiMessages.scrollHeight;
});

socket.on('midiMappingUpdate', (mappings) => {
    midiMappings.innerHTML = '';
    Object.entries(mappings).forEach(([midiControl, dmxChannel]) => {
        const mappingElement = document.createElement('div');
        mappingElement.textContent = `MIDI Control ${midiControl} -> DMX Channel ${dmxChannel}`;
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

// Request initial MIDI interfaces and mappings
socket.emit('getMidiInterfaces');
socket.emit('getMidiMappings');