const helper = require('node-red-node-test-helper');
const lightNode = require('../light-transition.js');

function flow(config) {
  return [
    {
      id: 'n1',
      type: 'light-transition',
      name: 'transition',
      wires: [['n2'], ['n3']],
      transitionTime: 1,
      transitionTimeUnits: 'Second',
      steps: 5,
      startBright: 1,
      endBright: 100,
      ...config,
    },
    { id: 'n2', type: 'helper' },
    { id: 'n3', type: 'helper' },
  ];
}

// Sends msg and resolves with everything the node sent until it reported 'complete'
function run(config, msg) {
  return new Promise((resolve, reject) => {
    helper.load(lightNode, flow(config), function () {
      const out = { first: [], second: [], took: 0 };
      const started = Date.now();
      helper.getNode('n2').on('input', (m) => out.first.push(m));
      helper.getNode('n3').on('input', (m) => {
        out.second.push(m);
        out.took = Date.now() - started;
        setTimeout(() => resolve(out), 100);
      });
      helper.getNode('n1').receive(msg || { payload: 'go' });
      setTimeout(() => reject(new Error('timeout, got ' + out.first.length + ' messages')), 4000);
    });
  });
}

describe('light-transition Node - fixes and new options', function () {
  this.timeout(6000);

  before((done) => {
    helper.startServer(done);
  });

  after((done) => {
    helper.stopServer(done);
  });

  afterEach(function () {
    return helper.unload();
  });

  describe('timing', function () {
    it('does not drift: 40 steps in 1 second are done in about 1 second', async function () {
      const out = await run({ steps: 40 });
      out.first.length.should.equal(40);
      out.took.should.be.within(800, 1400);
    });

    it('a new message restarts the transition, the old one stops', function () {
      return new Promise((resolve, reject) => {
        helper.load(lightNode, flow({ steps: 10, transitionTime: 1 }), function () {
          const n1 = helper.getNode('n1');
          const seen = [];
          helper.getNode('n2').on('input', (m) => seen.push(m.topic));
          helper.getNode('n3').on('input', () => {
            setTimeout(() => {
              try {
                seen.filter((t) => t === 'a').length.should.be.below(10);
                seen.filter((t) => t === 'b').length.should.equal(10);
                resolve();
              } catch (e) {
                reject(e);
              }
            }, 200);
          });
          n1.receive({ payload: 'go', topic: 'a' });
          setTimeout(() => n1.receive({ payload: 'go', topic: 'b' }), 250);
        });
      });
    });
  });

  describe('steps', function () {
    it('steps: 1 sends the start values, then the end values after the total time (they used to be NaN)', async function () {
      const out = await run({ steps: 1 });
      out.first.length.should.equal(2);
      out.first[0].payload.should.have.property('brightness_pct', 1);
      out.first[1].payload.should.have.property('brightness_pct', 100);
      out.first[1].payload.rgb_color.should.deepEqual([255, 255, 255]);
      out.second[0].payload.should.equal('complete');
      out.took.should.be.within(800, 1400);
    });
  });

  describe('colors', function () {
    it('Weighted with identical colors gives valid numbers (it used to give NaN)', async function () {
      const out = await run({ steps: 6, startRGB: '#336699', transitionRGB: '#336699', endRGB: '#336699' });
      out.first.length.should.equal(6);
      out.first.forEach((m) => m.payload.rgb_color.should.deepEqual([51, 102, 153]));
    });

    it('accepts short and alpha hex colors instead of crashing', async function () {
      const out = await run({ steps: 3 }, { payload: 'go', transition: { startRGB: '#f00', transitionRGB: '#00ff00', endRGB: '#0000ffcc' } });
      out.first[0].payload.rgb_color.should.deepEqual([255, 0, 0]);
      out.first[2].payload.rgb_color.should.deepEqual([0, 0, 255]);
    });

    it('an empty color falls back to the defaults instead of crashing', async function () {
      const out = await run({ steps: 3 }, { payload: 'go', transition: { startRGB: '', transitionRGB: '', endRGB: '' } });
      out.first[0].payload.rgb_color.should.deepEqual([255, 0, 0]);
      out.first[2].payload.rgb_color.should.deepEqual([255, 255, 255]);
    });

    it('colorRounding Round stays within 0-255', async function () {
      const out = await run({ steps: 40, startRGB: '#ffffff', transitionRGB: '#ffc864', endRGB: '#ff0000', colorRounding: 'Round' });
      out.first.length.should.equal(40);
      out.first.forEach((m) => m.payload.rgb_color.forEach((v) => v.should.be.within(0, 255)));
    });
  });

  describe('payloadFormat', function () {
    it('Flat (default) keeps the values in msg.payload', async function () {
      const out = await run({ steps: 2 });
      out.first[0].payload.should.have.keys('brightness_pct', 'brightness', 'rgb_color', 'color_temp', 'color_temp_kelvin');
    });

    it('HomeAssistant puts the values in msg.payload.data (issue #48)', async function () {
      const out = await run({ steps: 2, payloadFormat: 'HomeAssistant' });
      out.first.length.should.equal(2);
      out.first.forEach((m) => {
        m.payload.should.have.keys('data');
        m.payload.data.should.have.keys('brightness_pct', 'brightness', 'rgb_color', 'color_temp', 'color_temp_kelvin');
      });
      out.second[0].payload.should.equal('complete');
    });

    it('can be switched per message with msg.transition.payloadFormat', async function () {
      const out = await run({ steps: 2 }, { payload: 'go', transition: { payloadFormat: 'HomeAssistant' } });
      out.first[0].payload.should.have.property('data');
    });
  });
});
