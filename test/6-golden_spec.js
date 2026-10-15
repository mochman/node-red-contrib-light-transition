// Compares the output of the node with what version 1.9.1 produced for the same input (see test/tools/capture-golden.js).
// This guards the existing behavior, new options are off by default and must not change anything.
const helper = require('node-red-node-test-helper');
const lightNode = require('../light-transition.js');
const golden = require('./fixtures/golden.json');
const { cases } = require('./helpers/golden-cases.js');

function strip(m) {
  const copy = JSON.parse(JSON.stringify(m));
  delete copy._msgid;
  return copy;
}

describe('light-transition Node - Output is unchanged compared to 1.9.1', function () {
  this.timeout(15000);

  before((done) => {
    helper.startServer(done);
  });

  after((done) => {
    helper.stopServer(done);
  });

  afterEach(function () {
    return helper.unload();
  });

  it(`produces the recorded output for all ${cases.length} scenarios`, function (done) {
    // All scenarios run side by side in one flow to keep the test fast
    const flow = [];
    cases.forEach((c, i) => {
      flow.push({
        id: `n${i}`,
        type: 'light-transition',
        wires: [[`a${i}`], [`b${i}`]],
        transitionTime: 1,
        transitionTimeUnits: 'Second',
        ...c.config,
      });
      flow.push({ id: `a${i}`, type: 'helper' });
      flow.push({ id: `b${i}`, type: 'helper' });
    });

    helper.load(lightNode, flow, function () {
      const out = cases.map(() => ({ first: [], second: [] }));
      let finished = 0;
      cases.forEach((c, i) => {
        helper.getNode(`a${i}`).on('input', (m) => out[i].first.push(strip(m)));
        helper.getNode(`b${i}`).on('input', (m) => {
          out[i].second.push(strip(m));
          if (++finished === cases.length) {
            // Give late messages a chance to show up, there must not be any
            setTimeout(() => {
              try {
                cases.forEach((cs, j) => {
                  out[j].should.deepEqual(golden[cs.name], `scenario ${cs.name}`);
                });
                done();
              } catch (e) {
                done(e);
              }
            }, 300);
          }
        });
      });
      cases.forEach((c, i) => helper.getNode(`n${i}`).receive({ payload: 'start', ...(c.msg || {}) }));
    });
  });
});
