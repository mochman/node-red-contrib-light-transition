const {
  calcDuration, readableDuration, buildPlan, valuesAt,
} = require('./lib/transition.js');

module.exports = function (RED) {
  function LightTransition(n) {
    RED.nodes.createNode(this, n);
    let node = this;
    let current = null; // state of the running transition, null when idle
    let rgbRegex = new RegExp('^(#(?:(?:[A-F0-9]{2}){3,4}|[A-F0-9]{3})|)$', 'i');

    this.on('input', function (msg) {
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
      this.payloadFormat = n.payloadFormat || 'Flat';
      this.colorRounding = n.colorRounding || 'Truncate';
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

        if (msg.transition.colorRounding != undefined) {
          if ((msg.transition.colorRounding === 'Truncate') || (msg.transition.colorRounding === 'Round')) {
            node.colorRounding = msg.transition.colorRounding;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: RED._('light-transition.errors.invalidA') + ' msg.transition.colorRounding' });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.colorRounding, ' + RED._('light-transition.errors.allowedVals') + ' Truncate or Round');
            return;
          }
        }

        if (msg.transition.payloadFormat != undefined) {
          if ((msg.transition.payloadFormat === 'Flat') || (msg.transition.payloadFormat === 'HomeAssistant')) {
            node.payloadFormat = msg.transition.payloadFormat;
          } else {
            node.status({ fill: 'red', shape: 'ring', text: RED._('light-transition.errors.invalidA') + ' msg.transition.payloadFormat' });
            node.error(RED._('light-transition.errors.invalidA') + ': msg.transition.payloadFormat, ' + RED._('light-transition.errors.allowedVals') + ' Flat or HomeAssistant');
            return;
          }
        }
      } // End Input Checking
      node.nodeduration = calcDuration(node.transitionTimeUnits, node.transitionTime / node.steps);
      node.nodemaxtimeout = calcDuration(node.transitionTimeUnits, node.transitionTime + 5);

      // A new message always replaces the running transition
      stopCurrent();

      if (msg.payload != null && msg.payload.toString().toLowerCase() === 'stop') {
        // If msg.payload is sent a stop command, stop the loop and quit
        node.status({ fill: 'red', shape: 'ring', text: `node-red:inject.stopped` });
        let stopmsg = RED.util.cloneMessage(msg);
        stopmsg.payload = 'stopped';
        delete stopmsg['_timerpass'];
        node.send([null, stopmsg]);
        return;
      }

      // Everything the timers need is copied here, so later messages can not change a running transition
      // With 'steps' = 1 there is still a first message, and the last one follows after the total time
      const messages = Math.max(node.steps, 2);
      const run = {
        msg: msg,
        plan: buildPlan(node, messages),
        steps: node.steps,
        last: messages - 1, // index of the final message
        interval: node.nodeduration,
        payloadFormat: node.payloadFormat,
        startedAt: Date.now(),
        index: 1, // index of the next message to send, the first one (0) goes out right now
        timer: null,
      };

      // Initial loop output
      node.send([lightMessage(run, 0), null]);
      current = run;
      runningStatus(run, 0);
      schedule(run);
    });

    // Copy msg object to preserve user keys i.e. msg.topic, and remove the internal timerpass key
    function lightMessage(run, index) {
      let lightMsg = RED.util.cloneMessage(run.msg);
      delete lightMsg['_timerpass'];
      const values = valuesAt(run.plan, index);
      // 'HomeAssistant' puts the values under payload.data, which is where the Home Assistant action nodes read them
      lightMsg.payload = run.payloadFormat === 'HomeAssistant' ? { data: values } : values;
      return lightMsg;
    }

    function runningStatus(run, index) {
      const [value, unitKey] = readableDuration(run.interval);
      node.status({ fill: 'green', shape: 'ring', text: `${RED._('light-transition.description.running')} ${index + 1}/${run.steps} - ${RED._('light-transition.description.every')} ${value} ${RED._('node-red:' + unitKey)}` });
    }

    function completed(run, lightMsg) {
      let mlmsg = RED.util.cloneMessage(run.msg);
      mlmsg.payload = 'complete';
      delete mlmsg['_timerpass'];
      node.send([lightMsg, mlmsg]);
      let now = new Date;
      let splitDate = now.toDateString().split(' ');
      let splitTime = now.toTimeString().split(':');
      let goodDate = splitDate[1] + ' ' + splitDate[2] + ', ' + splitTime[0] + ':' + splitTime[1];
      node.status({ fill: 'green', shape: 'dot', text: `${RED._('light-transition.description.completed')} ${goodDate}` });
    }

    // Every message is due at a fixed time after the start, so the timers never drift
    function schedule(run) {
      const due = run.startedAt + run.index * run.interval;
      run.timer = setTimeout(() => tick(run), Math.max(0, due - Date.now()));
    }

    function tick(run) {
      run.timer = null;
      const index = run.index;
      if (index >= run.last) {
        // Final loop output
        current = null;
        completed(run, lightMessage(run, index));
      } else {
        // All other loop outputs
        node.send([lightMessage(run, index), null]);
        run.index++;
        runningStatus(run, index);
        schedule(run);
      }
    }

    function stopCurrent() {
      if (current && current.timer) clearTimeout(current.timer);
      current = null;
    }

    this.on('close', function () {
      stopCurrent();
      node.status({});
    });
  }
  RED.nodes.registerType('light-transition', LightTransition);
}
