const socket = io();

const oscMessages = document.getElementById('oscMessages');
const oscTestAddress = document.getElementById('oscTestAddress');
const oscTestValue = document.getElementById('oscTestValue');
const sendOscTestButton = document.getElementById('sendOscTest');

socket.on('oscMessage', (message) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = `Address: ${message.address}, Args: ${JSON.stringify(message.args)}`;
    
    if (message.address.startsWith('/SCENE/')) {
        messageElement.style.color = 'green';
        messageElement.textContent += ' (Scene Activation)';
    }
    
    oscMessages.appendChild(messageElement);
    oscMessages.scrollTop = oscMessages.scrollHeight;
});

sendOscTestButton.addEventListener('click', () => {
    const address = oscTestAddress.value;
    const value = oscTestValue.value;
    if (address && value) {
        socket.emit('sendOscTest', { address, value });
        const messageElement = document.createElement('div');
        messageElement.textContent = `Sent - Address: ${address}, Value: ${value}`;
        messageElement.style.color = 'blue';
        oscMessages.appendChild(messageElement);
        oscMessages.scrollTop = oscMessages.scrollHeight;
    } else {
        alert('Please enter both OSC address and value');
    }
});

// Clear messages when the page loads
oscMessages.innerHTML = '';

// Request any stored OSC messages (if implemented on the server)
socket.emit('getStoredOscMessages');

// Listen for OSC settings updates
socket.on('oscSettings', (settings) => {
    const settingsElement = document.createElement('div');
    settingsElement.textContent = `OSC Settings - Input Port: ${settings.inputPort}, Output Port: ${settings.outputPort}, Output Address: ${settings.outputAddress}`;
    settingsElement.style.color = 'green';
    oscMessages.appendChild(settingsElement);
});

// Request current OSC settings
socket.emit('getOscSettings');

// Listen for scene activations
socket.on('sceneActivated', (sceneName) => {
    const sceneElement = document.createElement('div');
    sceneElement.textContent = `Scene Activated: ${sceneName}`;
    sceneElement.style.color = 'purple';
    oscMessages.appendChild(sceneElement);
    oscMessages.scrollTop = oscMessages.scrollHeight;
});