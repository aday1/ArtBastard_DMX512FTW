const socket = io();

const fixtureName = document.getElementById('fixtureName');
const startAddress = document.getElementById('startAddress');
const channelCount = document.getElementById('channelCount');
const addFixtureButton = document.getElementById('addFixture');
const fixtureList = document.getElementById('fixtureList');

addFixtureButton.addEventListener('click', () => {
    const fixture = {
        name: fixtureName.value,
        startAddress: parseInt(startAddress.value),
        channelCount: parseInt(channelCount.value)
    };
    socket.emit('setupFixture', fixture);
    updateFixtureList(fixture);
    fixtureName.value = '';
    startAddress.value = '';
    channelCount.value = '';
});

function updateFixtureList(fixture) {
    const fixtureElement = document.createElement('div');
    fixtureElement.textContent = `${fixture.name}: Address ${fixture.startAddress}, Channels ${fixture.channelCount}`;
    fixtureList.appendChild(fixtureElement);
}

socket.on('fixtureList', (fixtures) => {
    fixtureList.innerHTML = '';
    fixtures.forEach(updateFixtureList);
});

// Request initial fixture list
socket.emit('getFixtureList');