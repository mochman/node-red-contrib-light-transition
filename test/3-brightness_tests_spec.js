let helper = require('node-red-node-test-helper');
let lightNode = require('../light-transition.js');

let numSteps = 5;

let startingFlow = [
	{
		id: 'n1',
		type: 'light-transition',
		name: 'transition',
		wires: [['n2'], ['n3']],
		startRGB: '#ff0000',
		transitionRGB: '#ffc864',
		endRGB: '#ffffff',
		startMired: '',
		endMired: '',
		transitionTime: 5,
		transitionTimeUnits: 'Second',
		steps: 1,
		startBright: 1,
		endBright: 100,
		brightnessType: 'Percent',
		transitionType: 'Exponential',
		colorTransitionType: 'Weighted',
	},
	{ id: 'n2', type: 'helper' },
	{ id: 'n3', type: 'helper' },
];

let trys = [
	{
		startBright: 0,
		startMired: 100,
		steps: numSteps,
		endBright: 87,
		endMired: 100,
		units: 'Second',
		duration: 2,
	},
	{
		startBright: 0,
		startMired: 100,
		brightnessType: 'Integer',
		steps: numSteps,
		endBright: 100,
		endMired: 100,
		units: 'Second',
		duration: 2,
	},
	{
		startBright: 100,
		steps: numSteps,
		startRGB: '#123456',
		endRGB: '#FA0024',
		endBright: 1,
		units: 'Second',
		duration: 2,
	},
	{
		startBright: 100,
		steps: numSteps,
		startRGB: '#123456',
		brightnessType: 'Integer',
		endRGB: '#FA0024',
		endBright: 1,
		units: 'Second',
		duration: 2,
	},
];

describe('light-transition Node - Brightness Tests', function () {
	before((done) => {
		helper.startServer(done);
	});

	after((done) => {
		helper.stopServer(done);
	});

	afterEach(function () {
		helper.unload();
	});

	for (let i = 0; i < trys.length; i++) {
		it(`Checking for valid brightness numbers ${i + 1}`, function (done) {
			let msg = {};
			msg.transition = trys[i];
			this.timeout(1000 * (msg.transition.duration + 1));
			let count = 0;
			helper.load(lightNode, startingFlow, function () {
				let n2 = helper.getNode('n2');
				let n1 = helper.getNode('n1');
				n2.on('input', function (msg) {
					count++;
					if (msg.payload.brightness_pct < 0 || msg.payload.brightness_pct > 100 || isNaN(msg.payload.brightness_pct)) {
						done(new Error(`brightness_pct: ${msg.payload.brightness_pct} at step ${count} `));
					} else if (msg.payload.brightness < 0 || msg.payload.brightness > 255 || isNaN(msg.payload.brightness)) {
						done(new Error(`brightness: ${msg.payload.brightness} at step ${count} `));
					}
					if (count === numSteps) {
						done();
					}
				});
				n1.receive(msg);
			});
		});
	}
});
