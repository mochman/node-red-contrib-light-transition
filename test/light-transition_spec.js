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
		transitionType: 'Linear',
		colorTransitionType: 'Weighted',
	},
	{ id: 'n2', type: 'helper' },
	{ id: 'n3', type: 'helper' },
];

let trys = [
	[
		{
			transition: {
				startBright: 35,
				startMired: 423,
				steps: numSteps,
				endBright: 87,
				endMired: 100,
				units: 'Second',
				duration: 2,
			},
		},
		{
			brightness: 90,
			brightness_pct: 35,
			color_temp: 423,
			rgb_color: [255, 0, 0],
		},
		{
			brightness: 222,
			brightness_pct: 87,
			color_temp: 100,
			rgb_color: [255, 255, 255],
		},
	],
	[
		{
			transition: {
				startBright: 100,
				steps: numSteps,
				startRGB: '#123456',
				endRGB: '#FA0024',
				endBright: 14,
				units: 'Second',
				duration: 2,
			},
		},
		{
			brightness: 255,
			brightness_pct: 100,
			color_temp: 200,
			rgb_color: [18, 52, 86],
		},
		{
			brightness: 36,
			brightness_pct: 14,
			color_temp: 600,
			rgb_color: [250, 0, 36],
		},
	],
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
			duration: 3,
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
			duration: 3,
			colorTransitionType: 'Half',
		},
	},
];

let stpMsg = { payload: 'STOP' };

describe('light-transition Node', function () {
	before((done) => {
		helper.startServer(done);
	});

	after((done) => {
		helper.stopServer(done);
	});

	afterEach(function () {
		helper.unload();
	});

	it('Can be loaded', function (done) {
		let flow = [{ id: 'n1', type: 'light-transition', name: 'test name' }];
		helper.load(lightNode, flow, function () {
			let n1 = helper.getNode('n1');
			n1.should.have.property('name', 'test name');
			done();
		});
	});

	it('Can be stopped', function (done) {
		helper.load(lightNode, startingFlow, function () {
			let n1 = helper.getNode('n1');
			let n3 = helper.getNode('n3');
			n3.on('input', function (msg) {
				try {
					msg.should.have.property('payload', 'stopped');
					done();
				} catch (err) {
					done(err);
				}
			});
			n1.receive({ payload: 'start' });
			setTimeout(() => {
				n1.receive(stpMsg);
			}, 1000);
		});
	});

	it('msg.payload with no forced inputs', function (done) {
		let noInp = {
			brightness: 3,
			brightness_pct: 1,
			color_temp: 200,
			rgb_color: [255, 0, 0],
		};

		helper.load(lightNode, startingFlow, function () {
			let n2 = helper.getNode('n2');
			let n1 = helper.getNode('n1');
			n2.on('input', function (msg) {
				try {
					msg.should.have.property('payload', noInp);
					done();
				} catch (err) {
					done(err);
				}
			});
			n1.receive({ payload: 'start' });
			n1.receive(stpMsg);
		});
	});

	it('msg.topic pass through', function (done) {
		let testTopic = { key1: 'key1', key2: [1, 2, 3] };
		helper.load(lightNode, startingFlow, function () {
			let n2 = helper.getNode('n2');
			let n1 = helper.getNode('n1');
			n2.on('input', function (msg) {
				try {
					msg.should.have.property('topic', testTopic);
					done();
				} catch (err) {
					done(err);
				}
			});
			n1.receive({ payload: 'start', topic: testTopic });
			n1.receive(stpMsg);
		});
	});

	for (let i = 0; i < trys.length; i++) {
		it(`msg.payload with forced input ${i + 1}`, function (done) {
			let forcedInp = trys[i][1];
			let msg = trys[i][0];
			helper.load(lightNode, startingFlow, function () {
				let n2 = helper.getNode('n2');
				let n1 = helper.getNode('n1');
				n2.on('input', function (msg) {
					try {
						msg.should.have.property('payload', forcedInp);
						done();
					} catch (err) {
						done(err);
					}
				});
				n1.receive(msg);
				n1.receive(stpMsg);
			});
		});
	}

	for (let i = 0; i < trys.length; i++) {
		it(`msg.payload check last output ${i + 1}`, function (done) {
			let endMsg = trys[i][2];
			let sndMsg = trys[i][0];
			this.timeout(4000);
			let count = 0;
			helper.load(lightNode, startingFlow, function () {
				let n1 = helper.getNode('n1');
				let n2 = helper.getNode('n2');
				n2.on('input', (msg) => {
					try {
						count++;
						if (count === numSteps) {
							msg.should.have.property('payload', endMsg);
							setTimeout(function () {
								done();
							}, 1000);
						}
					} catch (err) {
						done(err);
					}
				});
				n1.receive(sndMsg);
			});
		});
	}

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
						done(new Error(`Value less than 0 at index:${count}`));
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
