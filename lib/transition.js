'use strict';

// Pure helpers of the light-transition node: no timers, no Node-RED, easy to test.

const UNIT_MS = {
  Millisecond: 1,
  Second: 1000,
  Minute: 60 * 1000,
  Hour: 60 * 60 * 1000,
  Day: 24 * 60 * 60 * 1000,
};

function calcDuration(unit, duration) {
  if (!Object.prototype.hasOwnProperty.call(UNIT_MS, unit)) throw new Error(`Invalid unit: ${unit}`);
  return UNIT_MS[unit] * duration;
}

// Takes in ms and returns [value, unit key] i.e. [45, 'secs'] / [3, 'hours']. The caller translates the unit.
function readableDuration(duration) {
  const maxSeconds = 90;
  const maxMinutes = 59;
  const seconds = parseInt(duration) / 1000;
  if (seconds <= maxSeconds) {
    return [Math.round(seconds * 10) / 10, seconds > 1 ? 'delay.secs' : 'delay.sec'];
  } else if (seconds / 60 <= maxMinutes) {
    return [Math.round(seconds / 6) / 10, seconds / 60 > 1 ? 'delay.mins' : 'delay.min'];
  }
  return [Math.round(seconds / 360) / 10, seconds / 3600 > 1 ? 'delay.hours' : 'delay.hour'];
}

// Takes in "#fa12b3" (also "#fff" and "#fa12b3cc", the alpha is ignored) and returns [250,18,179], or null
function hexToRGB(hex) {
  if (typeof hex !== 'string') return null;
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})(?:[a-f\d]{2})?$/i.exec(hex);
  if (!result) {
    const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (short) result = [null, short[1] + short[1], short[2] + short[2], short[3] + short[3]];
  }
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
}

// Linear interpolation of input y given starting and ending ranges
function scale(y, range1 = [0, 100], range2 = [0, 255]) {
  const [xMin, xMax] = range2;
  const [yMin, yMax] = range1;
  const percent = (y - yMin) / (yMax - yMin);
  const ans = percent * (xMax - xMin) + xMin;
  return Math.round(ans);
}

// Resolves the three colors, falling back to the node defaults when one is empty or not parsable.
function resolveColors(startRGB, transitionRGB, endRGB) {
  const start = hexToRGB(startRGB) || [255, 0, 0];
  const transition = hexToRGB(transitionRGB) || start;
  const end = hexToRGB(endRGB) || [255, 255, 255];
  return [start, transition, end];
}

// Clamps the brightness values and converts them to percent.
function normalizeBrightness(startBright, endBright, brightnessType) {
  let start = Math.max(startBright, 0);
  let end = Math.max(endBright, 0);
  if (brightnessType === 'Percent') {
    start = Math.min(start, 100);
    end = Math.min(end, 100);
  } else if (brightnessType === 'Integer') {
    start = scale(Math.min(start, 255), [0, 255], [0, 100]);
    end = scale(Math.min(end, 255), [0, 255], [0, 100]);
  }
  return [start, end];
}

// Everything that does not change while a transition runs.
function buildPlan(cfg, steps = cfg.steps) {
  const colors = resolveColors(cfg.startRGB, cfg.transitionRGB, cfg.endRGB);
  const [startBright, endBright] = normalizeBrightness(cfg.startBright, cfg.endBright, cfg.brightnessType);
  const plan = {
    steps: steps,
    colors,
    startBright,
    endBright,
    startMired: cfg.startMired,
    endMired: cfg.endMired,
    transitionType: cfg.transitionType,
    colorTransitionType: cfg.colorTransitionType,
    colorRounding: cfg.colorRounding,
    tMid: 0,
    d1: [0, 0, 0],
    d2: [0, 0, 0],
  };

  if (plan.colorTransitionType === 'Weighted') {
    // Finds the 'distance' between the starting/transition/ending colors using the redmean approximation
    // https://en.wikipedia.org/wiki/Color_difference#sRGB
    // d1 will have the distance between starting & transition colors per steps required to arrive there.  d2 - transition & ending.
    // tMid will be the number of steps to the transition color.
    const changeDist = [0, 0];
    for (let i = 0; i < 2; i++) {
      const deltas = [colors[i][0] - colors[i + 1][0], colors[i][1] - colors[i + 1][1], colors[i][2] - colors[i + 1][2]];
      const mean = (colors[i][0] + colors[i + 1][0]) / 2;
      changeDist[i] = Math.sqrt((2 + mean / 256) * deltas[0] * deltas[0] + 4 * deltas[1] * deltas[1] + (2 + (255 - mean / 256)) * deltas[2] * deltas[2]);
    }
    const total = changeDist[0] + changeDist[1];
    // All three colors are identical: nothing to transition (the division below would give NaN)
    plan.tMid = total === 0 ? 0 : Math.trunc(plan.steps * changeDist[0] / total);
    for (let i = 0; i < 3; i++) {
      plan.d1[i] = (colors[1][i] - colors[0][i]) / plan.tMid;
      plan.d2[i] = (colors[2][i] - colors[1][i]) / (plan.steps - plan.tMid);
    }
  }
  return plan;
}

// Converts an interpolated channel value to a whole number. 'Truncate' is the original behaviour. 'Round' stays within
// 0-255 as well, because the value is interpolated between two channel values that are within 0-255 themselves.
function toChannel(plan, value) {
  if (plan.colorRounding !== 'Round') return Math.trunc(value);
  return Math.min(255, Math.max(0, Math.round(value))) + 0; // + 0 turns -0 into 0
}

function colorAt(plan, data) {
  const colors = plan.colors;
  const steps = plan.steps;
  const colorChange = [0, 0, 0];
  switch (plan.colorTransitionType) {
    case 'Weighted':
      // Either add the transition 'distance' to the starting RGB values or the transition RGB value
      for (let i = 0; i < 3; i++) {
        if (data < plan.tMid) colorChange[i] = toChannel(plan, colors[0][i] + data * plan.d1[i]);
        else if (data === plan.tMid) colorChange[i] = colors[1][i];
        else colorChange[i] = toChannel(plan, colors[1][i] + (data - plan.tMid) * plan.d2[i]);
      }
      break;
    case 'Half': {
      // Find the middle number of total steps, then subtract the average distance / steps from the starting/transition RGB values
      const midPt = Math.floor((steps - 1) / 2);
      for (let i = 0; i < 3; i++) {
        if (data === midPt) colorChange[i] = colors[1][i];
        else if (data <= midPt) colorChange[i] = colors[0][i] - Math.floor((colors[0][i] - colors[1][i]) / midPt * data);
        else colorChange[i] = colors[1][i] - Math.floor((colors[1][i] - colors[2][i]) / (steps - midPt - 1) * (data - midPt));
      }
      break;
    }
    case 'None':
      // Just increments the starting RGB value by the average of the starting & ending RGB values / num of steps.
      for (let i = 0; i < 3; i++) {
        colorChange[i] = colors[0][i] - Math.floor((colors[0][i] - colors[2][i]) / steps * data);
      }
      break;
  }
  return colorChange;
}

function brightnessAt(plan, data) {
  const { startBright, endBright, steps } = plan;
  if (plan.transitionType === 'Exponential') {
    const endBrightExp = endBright === 0 ? 1 : endBright;
    const startBrightExp = startBright === 0 ? 1 : startBright;
    if (startBright <= endBright) {
      const exponB = Math.log(endBright / startBrightExp) / (steps - 1);
      return Math.floor(startBrightExp * Math.exp(exponB * data));
    }
    const exponB = Math.log(startBrightExp / endBrightExp) / (steps - 1);
    return startBrightExp - Math.floor(endBrightExp * Math.exp(exponB * data)) + endBrightExp;
  }
  return Math.trunc((endBright - startBright) / (steps - 1) * data + startBright);
}

function miredAt(plan, data) {
  // Just increments the mired value by the average of the starting & ending mired values / num of steps.
  return Math.floor((plan.endMired - plan.startMired) / (plan.steps - 1) * data + plan.startMired);
}

function lightValues(brightness, rgb, mired) {
  return {
    brightness_pct: brightness,
    brightness: scale(brightness),
    rgb_color: rgb,
    color_temp: mired,
    color_temp_kelvin: Math.round(1000000 / mired),
  };
}

// Values of the first message (data = 0), the last one (data = steps - 1) and the ones in between.
function valuesAt(plan, data) {
  if (data <= 0) return lightValues(plan.startBright, plan.colors[0].slice(), plan.startMired);
  if (data >= plan.steps - 1) return lightValues(plan.endBright, plan.colors[2].slice(), plan.endMired);
  return lightValues(brightnessAt(plan, data), colorAt(plan, data), miredAt(plan, data));
}

module.exports = { UNIT_MS, calcDuration, readableDuration, hexToRGB, scale, resolveColors, normalizeBrightness, buildPlan, valuesAt };
