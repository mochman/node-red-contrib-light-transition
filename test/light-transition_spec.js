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
		transitionTime: '5',
		transitionTimeUnits: 'Second',
		steps: '5',
		startBright: '1',
		endBright: '100',
		brightnessType: 'Percent',
		transitionType: 'Linear',
		colorTransitionType: 'Weighted',
	},
	{ id: 'n2', type: 'helper' },
	{ id: 'n3', type: 'helper' },
];
let stpMsg = { payload: 'STOP' };

describe('light-transition Node', function () {
	afterEach(function () {
		helper.unload();
	});

	it('should be loaded', function (done) {
		let flow = [{ id: 'n1', type: 'light-transition', name: 'test name' }];
		helper.load(lightNode, flow, function () {
			let n1 = helper.getNode('n1');
			n1.should.have.property('name', 'test name');
			done();
		});
	});

	it('No inputs', function (done) {
		let noInp = {
			brightness: 1,
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
		});
	});

	let trys = [
		[
			{
				transition: {
					startBright: 35,
					startMired: 423,
					endBright: 87,
					endMired: 100,
				},
			},
			{
				brightness: 89,
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
					startRGB: '#123456',
					endRGB: '#FA0024',
					endBright: 14,
				},
			},
			{
				brightness: 255,
				brightness_pct: 100,
				color_temp: 200,
				rgb_color: [18, 52, 86],
			},
			{
				brightness: 35,
				brightness_pct: 14,
				color_temp: 600,
				rgb_color: [250, 0, 36],
			},
		],
	];
	for (let i = 0; i < trys.length; i++) {
		it(`Forced inputs ${i + 1}`, function (done) {
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
			});
		});
	}

	for (let i = 0; i < trys.length; i++) {
		it(`Final output ${i + 1}`, function (done) {
			let endMsg = trys[i][2];
			let msg = trys[i][0];
			this.timeout(8000);
			helper.load(lightNode, startingFlow, function () {
				let n1 = helper.getNode('n1');
				let n2 = helper.getNode('n2');
				n1.receive(stpMsg);
				setTimeout(
					() =>
						n2.on('input', (msg) => {
							try {
								msg.should.have.property('payload', endMsg);
								done();
							} catch (err) {
								done(err);
							}
						}),
					4000
				);
				n1.receive(msg);
			});
		});
	}
});
