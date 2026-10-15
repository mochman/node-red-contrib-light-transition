const should = require('should');
const t = require('../lib/transition.js');

describe('lib/transition', function () {
  describe('hexToRGB', function () {
    it('parses 6 digit colors with and without #', function () {
      t.hexToRGB('#fa12b3').should.deepEqual([250, 18, 179]);
      t.hexToRGB('FA12B3').should.deepEqual([250, 18, 179]);
    });
    it('expands 3 digit colors and ignores alpha', function () {
      t.hexToRGB('#f80').should.deepEqual([255, 136, 0]);
      t.hexToRGB('#fa12b3cc').should.deepEqual([250, 18, 179]);
    });
    it('returns null for anything else', function () {
      should(t.hexToRGB('')).equal(null);
      should(t.hexToRGB('bad!')).equal(null);
      should(t.hexToRGB('#12345')).equal(null);
      should(t.hexToRGB(undefined)).equal(null);
    });
  });

  describe('calcDuration', function () {
    it('converts to milliseconds', function () {
      t.calcDuration('Millisecond', 5).should.equal(5);
      t.calcDuration('Second', 2).should.equal(2000);
      t.calcDuration('Minute', 1.5).should.equal(90000);
      t.calcDuration('Hour', 1).should.equal(3600000);
      t.calcDuration('Day', 1).should.equal(86400000);
    });
    it('throws on unknown units', function () {
      (() => t.calcDuration('Fortnight', 1)).should.throw(/Invalid unit/);
    });
  });

  describe('colorRounding (issue #47)', function () {
    const cfg = {
      startRGB: '#ffffff', transitionRGB: '#ffc864', endRGB: '#ff0000',
      startBright: 100, endBright: 1, brightnessType: 'Percent', transitionType: 'Linear',
      colorTransitionType: 'Weighted', startMired: 200, endMired: 600,
    };

    function distinct(steps, colorRounding) {
      const plan = t.buildPlan({ ...cfg, steps, colorRounding });
      const seen = new Set();
      for (let d = 0; d < steps; d++) {
        const rgb = t.valuesAt(plan, d).rgb_color;
        rgb.forEach((v) => v.should.be.within(0, 255));
        seen.add(rgb.join());
      }
      return seen.size;
    }

    it('uses more of the available colors with many steps', function () {
      for (const steps of [900, 1800]) {
        distinct(steps, 'Round').should.be.above(distinct(steps, 'Truncate'));
      }
      // The color path has about 506 distinct colors, truncating only uses about 400 of them
      distinct(1800, 'Round').should.be.above(480);
      distinct(1800, 'Truncate').should.be.below(420);
    });

    it('is off by default: the values are the truncated ones', function () {
      const trunc = t.buildPlan({ ...cfg, steps: 900 });
      const explicit = t.buildPlan({ ...cfg, steps: 900, colorRounding: 'Truncate' });
      for (let d = 0; d < 900; d++) {
        t.valuesAt(trunc, d).should.deepEqual(t.valuesAt(explicit, d));
      }
    });

    it('never produces -0', function () {
      const plan = t.buildPlan({ ...cfg, steps: 1800, colorRounding: 'Round' });
      for (let d = 0; d < 1800; d++) {
        t.valuesAt(plan, d).rgb_color.forEach((v) => Object.is(v, -0).should.equal(false));
      }
    });
  });
});
