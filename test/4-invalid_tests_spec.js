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
		transitionTime: 1,
		transitionTimeUnits: 'Second',
		steps: 5,
		startBright: 1,
		endBright: 100,
		brightnessType: 'Percent',
		transitionType: 'Linear',
		colorTransitionType: 'Weighted',
	},
	{ id: 'n2', type: 'helper' },
	{ id: 'n3', type: 'helper' },
];

let trys = [
	{ startRGB: 'bad' },
	{ transitionRGB: 'bad' },
	{ endRGB: 'bad' },
	{ startMired: 'bad' },
	{ startMired: -20 },
	{ endMired: 'bad' },
	{ endMired: -20 },
	{ duration: 'bad' },
	{ duration: -20 },
	{ steps: 'bad' },
	{ steps: -20 },
	{ startBright: 'bad' },
	{ startBright: -10 },
	{ startBright: 260 },
	{ endBright: 'bad' },
	{ endBright: -10 },
	{ endBright: 260 },
	{ units: 'bad' },
	{ brightnessType: 'bad' },
	{ transitionType: 'bad' },
	{ colorTransitionType: 'bad' },
];

describe('light-transition Node - Invalid Input Tests', function () {
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
		this.timeout(500);
		it(`Invalid ${Object.keys(trys[i])}`, function (done) {
			let msg = {};
			msg.transition = trys[i];
			helper.load(lightNode, startingFlow, function () {
				let n1 = helper.getNode('n1');
				n1.on('call:error', (call) => {
					done();
				});
				n1.receive(msg);
			});
		});
	}
});
