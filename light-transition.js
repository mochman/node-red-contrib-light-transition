module.exports = function (RED) {
  let Looper = require('loop');

  let unitMap = [
    { unit: 'Millisecond', multiplier: 1, duration: 1 },
    { unit: 'Second', multiplier: 1000, get duration() { return unitMap[0].duration * unitMap[1].multiplier } },
    { unit: 'Minute', multiplier: 60, get duration() { return unitMap[1].duration * unitMap[2].multiplier } },
    { unit: 'Hour', multiplier: 60, get duration() { return unitMap[2].duration * unitMap[3].multiplier } },
    { unit: 'Day', multiplier: 24, get duration() { return unitMap[3].duration * unitMap[4].multiplier } }
  ]

  function CalcDuration(unit, duration) {
    return (unitMap.find(o => o.unit === unit).duration * duration);
  }

  // Takes in ms and returns a string with human readable times i.e. "45 Seconds" / "3 Hours"
  function readableDuration(duration) {
    let maxSeconds = 90;
    let maxMinutes = 59;
    let seconds = parseInt(duration) / 1000;
    if(seconds <= maxSeconds) {
      return Math.round(seconds * 10) / 10 + ' ' + (seconds > 1 ? RED._('node-red:delay.secs') : RED._('node-red:delay.sec'));
    } else if(seconds/60 <= maxMinutes) {
      return Math.round(seconds/6) / 10 + ' ' + (seconds/60 > 1 ? RED._('node-red:delay.mins') : RED._('node-red:delay.min'));
    } else {
      return Math.round(seconds/360) / 10 + ' ' + (seconds/3600 > 1 ? RED._('node-red:delay.hours') : RED._('node-red:delay.hour'));
    }
  }

  // Takes in "#fa12b3" and returns an array with decimal values i.e. [250,18,179]
  function hexToRGB(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  // Linear interpolation of input y given starting and ending ranges
  function scale(y, range1 = [0,100], range2 = [0,255]) {
    const [xMin, xMax] = range2;
    const [yMin, yMax] = range1;
    const percent = (y - yMin) / (yMax - yMin);
    const ans = percent * (xMax - xMin) + xMin;
    return Math.round(ans);
  }

  function LightTransition(n) {
    RED.nodes.createNode(this, n);
    let node = this;
    let transition = null;
    let timeout = null;
    let stopped = false;
    let stopmsg = null;
    let mlmsg = null;
    let rgbRegex = new RegExp('^(#(?:(?:[A-F0-9]{2}){3,4}|[A-F0-9]{3})|)$', 'i');

    this.on('input', function (msg) {
      transition = Looper();
      this.nodeduration = n.nodeduration || 1;
      this.nodemaxtimeout = n.nodemaxtimeout || 1;
      this.startRGB = n.startRGB || '#ff0000';
      this.transitionRGB = n.transitionRGB || this.startRGB;
      this.endRGB = n.endRGB || '#ffffff';
      this.startMired = parseInt(n.startMired) || 200;
      this.endMired = parseInt(n.endMired) || 600;
      this.transitionTime = parseInt(n.transitionTime) || 15;
      this.transitionTimeUnits = n.transitionTimeUnits || 'Minute';
      this.steps = parseInt(n.steps) || 30;
      this.startBright = parseInt(n.startBright) || 0;
      this.endBright = parseInt(n.endBright) || 0;
      this.brightnessType = n.brightnessType || 'Percent';
      this.transitionType = n.transitionType || 'Linear';
      this.colorTransitionType = n.colorTransitionType || 'Weighted';
      if (this.transitionTime <= 1) this.transitionTime = 1;

      // Input checking of any received msg
      if (msg.transition != undefined) {

        if (msg.transition.startRGB != undefined) {
          if (rgbRegex.test(msg.transition.startRGB)) {
            node.startRGB = msg.transition.startRGB;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.startRGB ' + RED._('light-transition.errors.formatted') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.startRGB - '+ RED._('light-transition.errors.formatted'));
            return;
          }
        }

        if (msg.transition.transitionRGB != undefined) {
          if (rgbRegex.test(msg.transition.transitionRGB)) {
            node.transitionRGB = msg.transition.transitionRGB;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.transitionRGB '+ RED._('light-transition.errors.formatted') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.transitionRGB - '+ RED._('light-transition.errors.formatted'));
            return;
          }
        }

        if (msg.transition.endRGB != undefined) {
          if (rgbRegex.test(msg.transition.endRGB)) {
            node.endRGB = msg.transition.endRGB;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.endRGB '+ RED._('light-transition.errors.formatted') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.endRGB - '+ RED._('light-transition.errors.formatted'));
            return;
          }
        }

        if (msg.transition.startMired != undefined) {
          if (typeof msg.transition.startMired === 'number' && msg.transition.startMired > 0) {
            node.startMired = parseInt(msg.transition.startMired);
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.startMired ' + RED._('light-transition.errors.posInt') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.startMired - ' + RED._('light-transition.errors.posInt'));
            return;
          }
        }

        if (msg.transition.endMired != undefined) {
          if (typeof msg.transition.endMired === 'number' && msg.transition.endMired > 0) {
            node.endMired = parseInt(msg.transition.endMired);
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.endMired ' + RED._('light-transition.errors.posInt') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.endMired - ' + RED._('light-transition.errors.posInt'));
            return;
          }
        }

        if (msg.transition.duration != undefined) {
          if (typeof msg.transition.duration === 'number' && msg.transition.duration > 0) {
            node.transitionTime = parseInt(msg.transition.duration);
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.duration ' + RED._('light-transition.errors.posInt') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.duration - ' + RED._('light-transition.errors.posInt'));
            return;
          }
        }

        if (msg.transition.steps != undefined) {
          if (typeof msg.transition.steps === 'number' && msg.transition.steps > 0) {
            node.steps = parseInt(msg.transition.steps);
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.steps ' + RED._('light-transition.errors.posInt') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.steps - ' + RED._('light-transition.errors.posInt'));
            return;
          }
        }

        if (msg.transition.startBright != undefined) {
          if (typeof msg.transition.startBright === 'number' && msg.transition.startBright >= 0 && msg.transition.startBright <= 255) {
            node.startBright = parseInt(msg.transition.startBright);
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.startBright ' + RED._('light-transition.errors.brightnessVal') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.startBright - ' + RED._('light-transition.errors.brightnessVal'));
            return;
          }
        }

        if (msg.transition.endBright != undefined) {
          if (typeof msg.transition.endBright === 'number' && msg.transition.endBright >= 0 && msg.transition.endBright <= 255) {
            node.endBright = parseInt(msg.transition.endBright);
          } else {
            node.status({ fill: 'red', shape: 'ring', text: 'msg.transition.endBright ' + RED._('light-transition.errors.brightnessVal') });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.endBright - ' + RED._('light-transition.errors.brightnessVal'));
            return;
          }
        }

        if (msg.transition.units != undefined) {
          if ((msg.transition.units === 'Second') || (msg.transition.units === 'Minute') || (msg.transition.units === 'Hour')) {
            node.transitionTimeUnits = msg.transition.units;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: RED._('light-transition.errors.invalidA') + ' msg.transition.units' });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.units, ' + RED._('light-transition.errors.allowedVals') + ' Second, Minute, and Hour');
            return;
          }
        }

        if (msg.transition.brightnessType != undefined) {
          if ((msg.transition.brightnessType === 'Percent') || (msg.transition.brightnessType === 'Integer')) {
            node.brightnessType = msg.transition.brightnessType;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: RED._('light-transition.errors.invalidA') + ' msg.transition.brightnessType' });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.brightnessType, ' + RED._('light-transition.errors.allowedVals') + ' Percent or Integer');
            return;
          }
        }

        if (msg.transition.transitionType != undefined) {
          if ((msg.transition.transitionType === 'Linear') || (msg.transition.transitionType === 'Exponential')) {
            node.transitionType = msg.transition.transitionType;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: RED._('light-transition.errors.invalidA') + ' msg.transition.transitionType' });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.transitionType, ' + RED._('light-transition.errors.allowedVals') + ' Linear or Exponential');
            return;
          }
        }

        if (msg.transition.colorTransitionType != undefined) {
          if ((msg.transition.colorTransitionType === 'Weighted') || (msg.transition.colorTransitionType === 'Half') || (msg.transition.colorTransitionType === 'None')) {
            node.colorTransitionType = msg.transition.colorTransitionType;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: RED._('light-transition.errors.invalidA') + ' msg.transition.colorTransitionType' });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.colorTransitionType, ' + RED._('light-transition.errors.allowedVals') + ' Weighted, Half or None');
            return;
          }
        }
      } // End Input Checking

      node.nodeduration = CalcDuration(node.transitionTimeUnits, node.transitionTime / node.steps);
      node.nodemaxtimeout = CalcDuration(node.transitionTimeUnits, node.transitionTime + 5);
      transition.setTimeout(node.nodemaxtimeout);
      transition.setMaxLoop(node.steps - 1);

      //Make sure starting and ending brightness are within 0-100%, scaling if not using 'Percent'
      if(node.startBright < 0) node.startBright = 0;
      if(node.endBright < 0) node.endBright = 0;

      switch(node.brightnessType) {
        case 'Percent':
          if(node.startBright > 100) node.startBright = 100;
          if(node.endBright > 100) node.endBright = 100;
          break;
        case 'Integer':
          if(node.startBright > 255) node.startBright = 255;
          if(node.endBright > 255) node.endBright = 255;
          node.startBright = scale(node.startBright, [0,255], [0,100]);
          node.endBright = scale(node.endBright, [0,255], [0,100]);
          break;
      }

      let colors = [];
      let deltas = [];
      let means = [];
      let changeDist = [];
      colors.push(hexToRGB(node.startRGB));
      colors.push(hexToRGB(node.transitionRGB));
      colors.push(hexToRGB(node.endRGB));

      if (stopped === false || msg._timerpass !== true) {
        stopped = false;
        clearTimeout(timeout);
        timeout = null;
        if (msg.payload !== undefined && msg.payload.toString().toLowerCase() === 'stop') {
          // If msg.payload is sent a stop command, stop the loop and quit
          node.status({ fill: 'red', shape: 'ring', text: `node-red:inject.stopped` });
          stopped = true;
          stopmsg = RED.util.cloneMessage(msg);
          stopmsg.payload = 'stopped';
          delete stopmsg['_timerpass'];
          node.send([null, stopmsg]);
          stopped = false;
        } else {
          // Initial loop output
          let lightMsg = RED.util.cloneMessage(msg); // Copy msg object to preserve user keys i.e. msg.topic
          delete lightMsg['_timerpass']; // Remove internal timerpass key
          lightMsg.payload = {
              brightness_pct: node.startBright,
              brightness: scale(node.startBright),
              rgb_color: colors[0],
              color_temp: node.startMired,
							color_temp_kelvin: Math.round(1000000 / node.startMired),
            };
          node.send([lightMsg, null]);
          msg._timerpass = true;
          transition.run(function (next, err, data) {
            node.status({ fill: 'green', shape: 'ring', text: `${RED._('light-transition.description.running')} ${data + 1}/${node.steps} - ${RED._('light-transition.description.every')} ${readableDuration(node.nodeduration)}` });
            data++;
            timeout = setTimeout(function () {
              if (stopped === false) {
                if (data == node.steps - 1) {
                  // Final loop output
                  let lightMsg = RED.util.cloneMessage(msg);
                  delete lightMsg['_timerpass'];
                    lightMsg.payload = {
                      brightness_pct: node.endBright,
                      brightness: scale(node.endBright),
                      rgb_color: colors[2],
                      color_temp: node.endMired,
											color_temp_kelvin: Math.round(1000000 / node.endMired),
                    };
                  mlmsg = RED.util.cloneMessage(msg);
                  mlmsg.payload = 'complete';
                  delete mlmsg['_timerpass'];
                  node.send([lightMsg, mlmsg]);
                  let now = new Date;
                  let splitDate = now.toDateString().split(' ');
                  let splitTime = now.toTimeString().split(':');
                  let goodDate = splitDate[1] + ' ' + splitDate[2] + ', ' + splitTime[0] + ':' + splitTime[1];
                  node.status({ fill: 'green', shape: 'dot', text: `${RED._('light-transition.description.completed')} ${goodDate}` });
                  timeout = null;
                  next('break');
                } else {
                  // All other loop outputs
                  node.status({});
                  if ((data * node.nodeduration) <= node.nodemaxtimeout) {
                    let colorChange = [0,0,0];
                    for(let i = 0; i < colorChange.length; i++) {
                      switch (node.colorTransitionType) {
                        case 'Weighted':
                          // Finds the 'distance' between the starting/transition/ending colors using the redmean approximation
                          // https://en.wikipedia.org/wiki/Color_difference#sRGB
                          // d1 array will have the distance between starting & transition colors per steps required to arrive there.  d2 - transition & ending.
                          // tMid will be the number of steps to the transition color.
                          for (let i = 0; i < 2; i++) {
                            deltas[i] = [colors[i][0] - colors[i + 1][0], colors[i][1] - colors[i + 1][1], colors[i][2] - colors[i + 1][2]];
                            means[i] = (colors[i][0] + colors[i + 1][0]) / 2;
                            changeDist[i] = Math.sqrt((2 + means[i] / 256) * deltas[i][0] * deltas[i][0] + 4 * deltas[i][1] * deltas[i][1] + (2 + (255 - means[i] / 256)) * deltas[i][2] * deltas[i][2]);
                          }
                          let tMid = Math.trunc(node.steps * changeDist[0] / (changeDist[0] + changeDist[1]));
                          let d1 = [];
                          let d2 = [];
                          for (let i = 0; i < 3; i++) {
                            d1[i] = (colors[1][i] - colors[0][i]) / tMid;
                            d2[i] = (colors[2][i] - colors[1][i]) / (node.steps - tMid);
                          }
                          // Either add the transition 'distance' to the starting RGB values or the transition RGB value
                          if(data < tMid) {
                            colorChange[i] = Math.trunc(colors[0][i] + data * d1[i]);
                          } else if(data === tMid) {
                            colorChange[i] = colors[1][i];
                          }
                          else colorChange[i] = Math.trunc(colors[1][i] + (data - tMid) * d2[i]);
                          break;
                        case 'Half':
                          // Find the middle number of total steps, then subtract the average distance / steps from the starting/transition RGB values
                          let midPt = Math.floor((node.steps - 1) / 2);
                          if(data == midPt) colorChange = hexToRGB(node.transitionRGB);
                          else if(data <= midPt) colorChange[i] = colors[0][i] - Math.floor((colors[0][i] - colors[1][i]) / midPt * data);
                          else colorChange[i] = colors[1][i] - Math.floor((colors[1][i] - colors[2][i]) / (node.steps - midPt - 1) * (data - midPt));
                          break;
                        case 'None':
                          // Just increments the starting RGB value by the average of the starting & ending RGB values / num of steps.
                          colorChange[i] = colors[0][i] - Math.floor((colors[0][i] - colors[2][i]) / node.steps * data);
                          break;
                      }
                    }
                    // Just increments the mired value by the average of the starting & ending mired values / num of steps.
                    let miredChange = Math.floor((node.endMired - node.startMired) / (node.steps - 1) * data + node.startMired);
                    let brightnessChange = 0;
                    switch(node.transitionType) {
                      case 'Exponential':
                        const endBrightExp = node.endBright === 0 ? 1 : node.endBright;
                        const startBrightExp = node.startBright === 0 ? 1 : node.startBright;
                        let exponB = 0;
                        if (node.startBright <= node.endBright) {
                          exponB = Math.log(node.endBright / startBrightExp) / (node.steps - 1);
                          brightnessChange = Math.floor(startBrightExp * Math.exp(exponB * data));
                        } else {
                          exponB = Math.log(startBrightExp / endBrightExp) / (node.steps - 1);
                          brightnessChange = startBrightExp - Math.floor(endBrightExp * Math.exp(exponB * data)) + endBrightExp;
                        }
                        break;
                      case 'Linear':
                        brightnessChange = Math.trunc((node.endBright - node.startBright) / (node.steps - 1) * data + node.startBright);
                        break;
                    }
                    let lightMsg = RED.util.cloneMessage(msg);
                    delete lightMsg['_timerpass'];
                      lightMsg.payload = {
                        brightness_pct: brightnessChange,
                        brightness: scale(brightnessChange),
                        rgb_color: colorChange,
                        color_temp: miredChange,
												color_temp_kelvin: Math.round(1000000 / miredChange),
                      };
                    node.send([lightMsg, null]);
                    timeout = null;
                    if (((data + 1) * node.nodeduration) > node.nodemaxtimeout) {
                      next('break');
                    } else {
                      next(undefined, data);
                    }
                  } else {
                    timeout = null;
                    next('break');
                  }
                }
              } else {
                timeout = null;
                next('break');
              }
            }, node.nodeduration);
          }, 0);
        }
      }
    });
    this.on('close', function () {
      stopped = false;
      if (timeout) {
        clearTimeout(timeout);
      }
      node.status({});
    });
  }
  RED.nodes.registerType('light-transition', LightTransition);
}
