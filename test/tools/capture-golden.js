// Records the output of the node for every case in test/helpers/golden-cases.js.
// Usage (node >= 14): node test/tools/capture-golden.js test/fixtures/golden.json
// Optional environment variables: SECONDS (transition time of every case, default 4, the values do not depend on it)
// and FILTER (regular expression, only the matching cases are recorded).
const helper = require('node-red-node-test-helper');
const lightNode = require('../../light-transition.js');
const { cases: allCases } = require('../helpers/golden-cases.js');

const seconds = parseInt(process.env.SECONDS) || 4;
const cases = process.env.FILTER ? allCases.filter((c) => new RegExp(process.env.FILTER).test(c.name)) : allCases;

function strip(m) {
  const copy = JSON.parse(JSON.stringify(m));
  delete copy._msgid;
  return copy;
}

(async () => {
  await new Promise((r) => helper.startServer(r));

  // All cases run side by side in one flow
  const flow = [];
  cases.forEach((c, i) => {
    flow.push({
      id: `n${i}`, type: 'light-transition', wires: [[`a${i}`], [`b${i}`]],
      transitionTime: seconds, transitionTimeUnits: 'Second', ...c.config,
    });
    flow.push({ id: `a${i}`, type: 'helper' });
    flow.push({ id: `b${i}`, type: 'helper' });
  });

  const out = cases.map(() => ({ first: [], second: [] }));
  await new Promise((resolve) => {
    helper.load(lightNode, flow, () => {
      let finished = 0;
      cases.forEach((c, i) => {
        helper.getNode(`a${i}`).on('input', (m) => out[i].first.push(strip(m)));
        helper.getNode(`b${i}`).on('input', (m) => {
          out[i].second.push(strip(m));
          if (++finished === cases.length) setTimeout(resolve, 500);
        });
        helper.getNode(`n${i}`).receive({ payload: 'start', ...(c.msg || {}) });
      });
      setTimeout(resolve, (seconds + 8) * 1000);
    });
  });

  const result = {};
  cases.forEach((c, i) => { result[c.name] = out[i]; });
  // One line per scenario keeps the file small
  const lines = Object.keys(result).map((name) => `${JSON.stringify(name)}: ${JSON.stringify(result[name])}`);
  require('fs').writeFileSync(process.argv[2], `{\n${lines.join(',\n')}\n}\n`);
  process.exit(0);
})();
