let helper = require('node-red-node-test-helper');
let lightNode = require('../light-transition.js');

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
		transitionTime: 2,
		transitionTimeUnits: 'Second',
		steps: 1,
		startBright: 1,
		endBright: 100,
		brightnessType: 'Percent',
		transitionType: 'Linear',
		colorTransitionType: 'Weighted',
	},
	{ id: 'n2', type: 'helper' },
	{ id: 'n3', type: 'helper' },
];

let trysMired = [
	{
		transition: {
			startBright: 0,
			startMired: 1,
			endMired: 600,
			endBright: 100,
			units: 'Second',
			steps: 1,
			duration: 1,
			colorTransitionType: 'None',
		},
	},
	{
		transition: {
			startBright: 1,
			startMired: 5,
			endMired: 500,
			endBright: 99,
			units: 'Second',
			steps: 60,
			duration: 1,
			colorTransitionType: 'Half',
		},
	},
	{
		transition: {
			startBright: 1,
			startMired: 1,
			endMired: 1,
			endBright: 99,
			units: 'Second',
			steps: 60,
			duration: 1,
			colorTransitionType: 'None',
		},
	},
	{
		transition: {
			startBright: 1,
			startMired: 1,
			endMired: 2,
			endBright: 99,
			units: 'Second',
			steps: 60,
			duration: 1,
			colorTransitionType: 'None',
		},
	},
	{
		transition: {
			startBright: 1,
			startMired: 1,
			endMired: 61,
			endBright: 99,
			units: 'Second',
			steps: 60,
			duration: 1,
			colorTransitionType: 'Weighted',
		},
	},
	{
		transition: {
			startBright: 1,
			startMired: 1,
			endMired: 62,
			endBright: 99,
			units: 'Second',
			steps: 60,
			duration: 1,
			colorTransitionType: 'Weighted',
		},
	},
];

describe('light-transition Node - Mired Tests', function () {
	before((done) => {
		helper.startServer(done);
	});

	after((done) => {
		helper.stopServer(done);
	});

	afterEach(function () {
		helper.unload();
	});

	for (let i = 0; i < trysMired.length; i++) {
		it(`Mired Values - ${i + 1}`, function (done) {
			const sndMsg = trysMired[i];
			const numMsgs = sndMsg.transition.steps;
			this.timeout(1000 * (sndMsg.transition.duration + 1));
			let count = 0;
			helper.load(lightNode, startingFlow, function () {
				let n1 = helper.getNode('n1');
				let n2 = helper.getNode('n2');
				n2.on('input', (msg) => {
					count++;
					if (msg.payload.color_temp < 0) {
						done(new Error(`Value less than 0 at index:${count} - [${msg.payload.color_temp}]`));
					}
					if (count === numMsgs) {
						done();
					}
				});
				n1.receive(sndMsg);
			});
		});
	}
});
