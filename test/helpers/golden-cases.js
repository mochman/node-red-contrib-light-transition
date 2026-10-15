// Scenarios used to pin down the exact output of the node. The expected output in
// test/fixtures/golden.json was recorded from version 1.9.1 (test/tools/capture-golden.js).
const palettes = [
  { startRGB: '#ff0000', transitionRGB: '#ffc864', endRGB: '#ffffff' },
  { startRGB: '#FF1C1C', transitionRGB: '#F76A02', endRGB: '#FFFFFF' },
  { startRGB: '#ffffff', transitionRGB: '#ffc864', endRGB: '#ff0000' },
  { startRGB: '#102030', transitionRGB: '#102030', endRGB: '#c0ffee' },
];

const cases = [];

for (const colorTransitionType of ['Weighted', 'Half', 'None']) {
  for (const transitionType of ['Linear', 'Exponential']) {
    palettes.forEach((palette, p) => {
      for (const steps of [2, 3, 7, 30]) {
        cases.push({
          name: `${colorTransitionType}/${transitionType}/palette${p}/steps${steps}`,
          config: { ...palette, steps, startBright: 1, endBright: 100, colorTransitionType, transitionType },
        });
      }
    });
  }
}

// Brightness variations, mired and message overrides
for (const [startBright, endBright, brightnessType] of [[100, 1, 'Percent'], [0, 100, 'Percent'], [5, 250, 'Integer'], [200, 0, 'Integer'], [50, 50, 'Percent']]) {
  for (const transitionType of ['Linear', 'Exponential']) {
    cases.push({
      name: `brightness/${brightnessType}/${startBright}-${endBright}/${transitionType}`,
      config: { steps: 11, startBright, endBright, brightnessType, transitionType, startMired: '153', endMired: '500' },
    });
  }
}

cases.push({ name: 'defaults', config: { steps: 5, startRGB: '', transitionRGB: '', endRGB: '', startBright: 1, endBright: 100 } });
cases.push({ name: 'mired/default-range', config: { steps: 9, startBright: 10, endBright: 90 } });
cases.push({ name: 'mired/descending', config: { steps: 9, startMired: '500', endMired: '153' } });
cases.push({ name: 'topic-passthrough', config: { steps: 3 }, msg: { topic: 'kitchen', extra: { a: 1 } } });
cases.push({
  name: 'msg-override',
  config: { steps: 30, startBright: 1, endBright: 100 },
  msg: {
    transition: {
      startRGB: '#00ff00', transitionRGB: '#0000ff', endRGB: '#ff00ff', startMired: 200, endMired: 400,
      steps: 6, duration: 1, units: 'Second', startBright: 10, endBright: 20,
      brightnessType: 'Percent', transitionType: 'Linear', colorTransitionType: 'Weighted',
    },
  },
});
cases.push({ name: 'numeric-payload', config: { steps: 4 }, msg: { payload: 42 } });

module.exports = { cases };
