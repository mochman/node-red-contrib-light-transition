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
		transitionTime: 5,
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

let trysRGB = [
	{
		transition: {
			startBright: 0,
			startRGB: '#C2A800',
			endRGB: '#FF0000',
			endBright: 100,
			units: 'Second',
			steps: 60,
			duration: 1,
			colorTransitionType: 'None',
		},
	},
	{
		transition: {
			startBright: 1,
			startRGB: '#FF1C1C',
			transitionRGB: '#F76A02',
			endRGB: '#FFFFFF',
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
			startRGB: '#CAFE3E',
			endRGB: '#FFFF00',
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
			startRGB: '#FFFF00',
			endRGB: '#CAFE3E',
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
			startRGB: '#FF1C1C',
			transitionRGB: '#F76A02',
			endRGB: '#FFFFFF',
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
			startRGB: '#FF1C1C',
			transitionRGB: '#F76A02',
			endRGB: '#FFFFFF',
			endBright: 99,
			units: 'Second',
			steps: 60,
			duration: 1,
			colorTransitionType: 'Weighted',
		},
	},
];

describe('light-transition Node - RGB Tests', function () {
	before((done) => {
		helper.startServer(done);
	});

	after((done) => {
		helper.stopServer(done);
	});

	afterEach(function () {
		helper.unload();
	});

	for (let i = 0; i < trysRGB.length; i++) {
		it(`RGB Values - ${i + 1}`, function (done) {
			const sndMsg = trysRGB[i];
			const numMsgs = sndMsg.transition.steps;
			this.timeout(1000 * (sndMsg.transition.duration + 1));
			let count = 0;
			helper.load(lightNode, startingFlow, function () {
				let n1 = helper.getNode('n1');
				let n2 = helper.getNode('n2');
				n2.on('input', (msg) => {
					count++;
					if (msg.payload.rgb_color.filter((x) => x > 255).length) {
						done(new Error(`Value greater than 255 at index:${count} - [${msg.payload.rgb_color}]`));
					} else if (msg.payload.rgb_color.filter((x) => x < 0).length) {
						done(new Error(`Value less than 0 at index:${count}  - [${msg.payload.rgb_color}]`));
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
