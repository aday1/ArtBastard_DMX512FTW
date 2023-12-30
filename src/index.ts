import dmxlib from 'dmxnet';
import easymidi from 'easymidi';




const dmxnet = new dmxlib.dmxnet({
	log: { level: 'info' }, // Winston logger options
	//oem: 0, // OEM Code from artisticlicense, default to dmxnet OEM.
	//esta: 0, // ESTA Manufacturer ID from https://tsp.esta.org, default to ESTA/PLASA (0x0000)
	//sName: "Text", // 17 char long node description, default to "dmxnet"
	//lName: "Long description", // 63 char long node description, default to "dmxnet - OpenSource ArtNet Transceiver"
	//hosts: ["127.0.0.1"] // Interfaces to listen to, all by default
});

// Start dmxnet and start listening for DMX data

const sender = dmxnet.newSender({
	ip: "192.168.1.199", //IP to send to, default 255.255.255.255
	subnet: 0, //Destination subnet, default 0
	universe: 0, //Destination universe, default 0
	net: 0, //Destination net, default 0
	port: 6454, //Destination UDP Port, default 6454
	base_refresh_interval: 1000 // Default interval for sending unchanged ArtDmx
});

function delay(duration: number) {
	return new Promise(resolve => setTimeout(resolve, duration));
}

// chan 6 x = 33 - 83
// chan 7 y = 83 - 51

const xMin = 33;
const xMax = 83;
const yMin = 51;
const yMax = 83;
const xRange = xMax - xMin;
const yRange = yMax - yMin;

let xPhase = 0;
let yPhase = 0;



function tick(dt: number) {
	xPhase = (xPhase + dt / 2000) % 1;
	yPhase = (yPhase + dt / 200) % (Math.PI * 2);

	const x = xRange * xPhase + xMin;// Math.cos(phase) * 0.5 + 0.5;
	const y = (Math.sin(yPhase) * 0.5 + 0.5) * 0.3;

	sender.setChannel(6, Math.round(x));
	sender.setChannel(7, Math.round(y * yRange + yMin+20));
}

let timer = 1000;

let scale = 1.2;

let numPos = 0;
let numSpacing = (78 / 127) * 20;
let num = 123456;
let xPosRoot = 43;

function draw(dt: number) {
	timer -= dt;
	if (timer <= 0) {
		timer += 1000;
		num++;
		console.log(num);
	}

	let paddedNum = num.toString().padStart(5, '0');
	const numStr = paddedNum[numPos];
	const digit = parseInt(numStr, 10);

	let xPos = xPosRoot + numPos * numSpacing;
	xPos = Math.max(Math.min(xPos, 255), 0);
	sender.setChannel(6, xPos);
	
	const idx = digit === 0 ? 134 : 165 + digit * 2;
	const scaleValue = digit === 0 ? scale : scale;
	sender.setChannel(2, idx);	
	sender.setChannel(8, scaleValue);	

	numPos = (numPos + 1) % paddedNum.length;
}

async function run() {
	sender.reset();
	sender.setChannel(0, 1);
	sender.setChannel(6, 65); // initial x pos
	//sender.setChannel(8, 100 * scale); //scale
	sender.setChannel(8, 105);
	sender.setChannel(7, 69);
	scale = 105;

	//sender.setChannel(2, 170);

	//setInterval(() => { tick(20); }, 20);
	const time = 10;
	setInterval(() => { 
		draw(time);
	}, time);

	for (let i = 1; i < 512; i++) {
		for (let j = 0; j < 256; j++) {
			//console.log(i, j);		
			//sender.setChannel(i, j);
			//await delay(20);
		}
	}
	

	//sender.setChannel(1, 90);
}

easymidi.getInputs().map((name) => console.log(name));

var vrInput = new easymidi.Input('loopMIDI Port');
vrInput.on('cc', function (msg) {
	console.log(msg.controller, msg.value);

	const value = Math.floor(msg.value + shift * 128);
	const channel = msg.controller + 0;

	console.log(`Setting channel ${channel} to ${value}`);
	sender.setChannel(channel, value);
}); 

var input = new easymidi.Input('nanoKONTROL');

let shift = 0;

input.on('cc', function (msg) {
	console.log(`Received ${msg.controller} ${msg.value}`);
	
	if (msg.controller < 12) {
		const value = Math.floor(msg.value + shift * 128);
		const channel = msg.controller + 0;

		console.log(`Setting channel ${channel} to ${value}`);
		sender.setChannel(channel, value);
	} else if (msg.controller < 30) {
		if (msg.controller === 12) {
			sender.setChannel(8, msg.value);
			scale = msg.value;
		}

		if (msg.controller === 13) {
			numSpacing = (msg.value / 127) * 20;
		}

		if (msg.controller === 14) {
			xPosRoot = msg.value;
		}

		if (msg.controller === 15) {
			sender.setChannel(7, msg.value);
		}
	} else if (msg.value > 0) {
		console.log(msg.controller);
		shift = 1 - shift;		
		console.log(`Shift is now ${shift}`);
	}
});

run();


/*
for (let i = 0; i < 512; i++) {
	for (let j = 0; j < 256; j++) {
		console.log(`Setting channel ${i} to ${j}`);
		sender.setChannel(i,j);
	}
}
*/
