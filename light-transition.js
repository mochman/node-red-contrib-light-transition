module.exports = function (RED) {
	"use strict";
	var Looper = require('loop');

	var unitMap = [
			{ unit: "Millisecond", multiplier: 1, duration: 1 },
			{ unit: "Second", multiplier: 1000, get duration() { return unitMap[0].duration * unitMap[1].multiplier } },
			{ unit: "Minute", multiplier: 60, get duration() { return unitMap[1].duration * unitMap[2].multiplier } },
			{ unit: "Hour", multiplier: 60, get duration() { return unitMap[2].duration * unitMap[3].multiplier } },
			{ unit: "Day", multiplier: 24, get duration() { return unitMap[3].duration * unitMap[4].multiplier } }
	]

	var CalcDuration = function (unit, duration) { return (unitMap.find(o => o.unit === unit).duration * duration); }
	var hexToRGB = function(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? [
			parseInt(result[1], 16),
			parseInt(result[2], 16),
			parseInt(result[3], 16)
		 ] : null;
	}
	function LightTransition(n) {
			RED.nodes.createNode(this, n);
			this.nodeduration = n.nodeduration || 1;
			this.nodemaxtimeout = n.nodemaxtimeout || 1;
			this.startRGB = n.startRGB || "#ff0000";
			this.transitionRGB = n.transitionRGB || "#ffc864";
			this.endRGB = n.endRGB || "#ffffff";
			this.transitionTime = parseInt(n.transitionTime) || 15;
			this.transitionTimeUnits = n.transitionTimeUnits || "Minute";
			this.steps = parseInt(n.steps) || 30;
			this.startBright = parseInt(n.startBright) || 1;
			this.endBright = parseInt(n.endBright) || 100;
			this.transitionType = n.transitionType || "Linear";

			if(this.transitionTime <= 1) this.transitionTime = 1;

			var node = this;
			var transition = null;
			var timeout = null;
			var stopped = false;
			var stopmsg = null;
			var mlmsg = null;
			var rgbRegex = new RegExp('^(#(?:(?:[A-F0-9]{2}){3,4}|[A-F0-9]{3})|)$', 'i');

			this.on("input", function (msg) {
					transition = Looper();
					if (msg.transition != undefined) {

							if (msg.transition.startRGB != undefined) {
								if (rgbRegex.test(msg.transition.startRGB)) {
									node.startRGB = msg.transition.startRGB;
								} else {
									node.status({ fill: "red", shape: "ring", text: "msg.transition.startRGB must be formatted like #ffab13" });
									node.error('Invalid Attribbute: msg.transition.startRGB, value must be formatted like #ffab13');
									return;
								}
							}

							if (msg.transition.transitionRGB != undefined) {
								if (rgbRegex.test(msg.transition.transitionRGB)) {
									node.transitionRGB = msg.transition.transitionRGB;
								} else {
									node.status({ fill: "red", shape: "ring", text: "msg.transition.transitionRGB must be formatted like #ffab13" });
									node.error('Invalid Attribbute: msg.transition.transitionRGB, value must be formatted like #ffab13');
									return;
								}
							}

							if (msg.transition.endRGB != undefined) {
								if (rgbRegex.test(msg.transition.endRGB)) {
									node.endRGB = msg.transition.endRGB;
								} else {
									node.status({ fill: "red", shape: "ring", text: "msg.transition.endRGB must be formatted like #ffab13" });
									node.error('Invalid Attribbute: msg.transition.endRGB, value must be formatted like #ffab13');
									return;
								}
							}

							if (msg.transition.duration != undefined) {
								if (typeof msg.transition.duration === 'number' && msg.transition.duration > 0) {
									node.transitionTime = parseInt(msg.transition.duration);
								} else {
									node.status({ fill: "red", shape: "ring", text: "msg.transition.duration must be a positive integer" });
									node.error('Invalid Attribbute: msg.transition.duration, value must be a positive integer');
									return;
								}
							}

							if (msg.transition.steps != undefined) {
								if (typeof msg.transition.steps === 'number' && msg.transition.steps > 0) {
									node.steps = parseInt(msg.transition.steps);
								} else {
									node.status({ fill: "red", shape: "ring", text: "msg.transition.steps must be a positive integer" });
									node.error('Invalid Attribbute: msg.transition.steps, value must be a positive integer');
									return;
								}
							}

							if (msg.transition.startBright != undefined) {
								if (typeof msg.transition.startBright === 'number' && msg.transition.startBright > 0 && msg.transition.startBright <= 100) {
									node.startBright = parseInt(msg.transition.startBright);
								} else {
									node.status({ fill: "red", shape: "ring", text: "msg.transition.startBright must be between 1 and 100" });
									node.error('Invalid Attribbute: msg.transition.startBright, value must be between 1 and 100');
									return;
								}
							}

							if (msg.transition.endBright != undefined) {
								if (typeof msg.transition.endBright === 'number' && msg.transition.endBright > 0 && msg.transition.endBright <= 100) {
									node.endBright = parseInt(msg.transition.endBright);
								} else {
									node.status({ fill: "red", shape: "ring", text: "msg.transition.endBright must be between 1 and 100" });
									node.error('Invalid Attribbute: msg.transition.endBright, value must be between 1 and 100');
									return;
								}
							}

							if (msg.transition.units != undefined) {
								if ((msg.transition.units === "Second") || (msg.transition.units === "Minute") || (msg.transition.units === "Hour")) {
										node.transitionUnits = parseInt(msg.transition.units);
								} else {
										node.status({ fill: "red", shape: "ring", text: "Invalid attribbute msg.transition.units" });
										node.error('Invalid Attribbute: msg.transition.units, allowed values are Second, Minute, and Hour');
										return;
								}
							}

							if (msg.transition.transitionType != undefined) {
								if ((msg.transition.transitionType === "Linear") || (msg.transition.transitionType === "Exponential")) {
										node.transitionType = msg.transition.transitionType;
								} else {
										node.status({ fill: "red", shape: "ring", text: "Invalid attribbute msg.transition.transitionType" });
										node.error('Invalid Attribbute: msg.transition.transitionType, allowed values are Linear or Exponential');
										return;
								}
							}
					}

					node.nodeduration = CalcDuration(node.transitionTimeUnits, node.transitionTime / node.steps);
					node.nodemaxtimeout = CalcDuration(node.transitionTimeUnits, node.transitionTime + 5);

					transition.setTimeout(node.nodemaxtimeout);
					transition.setMaxLoop(node.steps-1);

					var colors = [];
					var deltas = [];
					var means = [];
					var changeDist = [];
					

					colors.push(hexToRGB(node.startRGB));
					colors.push(hexToRGB(node.transitionRGB));
					colors.push(hexToRGB(node.endRGB));
					for(let i=0;i<2;i++) {
						deltas[i] = [ colors[i][0] - colors[i+1][0], colors[i][1] - colors[i+1][1], colors[i][2] - colors[i+1][2] ];
						means[i] = (colors[i][0] + colors[i+1][0])/2;
					}
					for(let i=0;i<2;i++) {
						changeDist[i] = Math.sqrt((2+means[i]/256)*deltas[i][0]*deltas[i][0]+4*deltas[i][1]*deltas[i][1]+(2+(255-means[i]/256))*deltas[i][2]*deltas[i][2]);
					}
					var tMid = Math.floor(node.steps * changeDist[0]/(changeDist[0]+changeDist[1]));
					var d1 = [];
					var d2 = [];
					for(let i=0;i<3;i++) {
						d1[i] = Math.floor((colors[1][i] - colors[0][i]) / tMid);
						d2[i] = Math.floor((colors[2][i] - colors[1][i]) / (node.steps - tMid));
					}

					var exponB = 0;
					if(node.startBright <= node.endBright) {
						exponB = Math.log(node.endBright / node.startBright) / (node.steps-1);
					} else {
						exponB = Math.log(node.startBright / node.endBright) / (node.steps-1);
					}

					if (stopped === false || msg._timerpass !== true) {
							stopped = false;
							clearTimeout(timeout);
							timeout = null;
							if (msg.payload == "stop" || msg.payload == "STOP") {
									node.status({
											fill: "red",
											shape: "ring",
											text: "stopped"
									});
									stopped = true;
									stopmsg = RED.util.cloneMessage(msg);
									stopmsg.payload = "stopped";
									node.send([null, stopmsg]);
									stopped = false;
							} else {
									var lightMsg = {payload: {
										brightness_pct: node.startBright,
										rgb_color: colors[0],
									}}
									node.send([lightMsg, null]);
									msg._timerpass = true;
									transition.run(function (next, err, data) {
											node.status({
													fill: "green",
													shape: "ring",
													text: "running " + (data+1) + "/" + node.steps,
											});
											data++;
											timeout = setTimeout(function () {
													if (stopped === false) {
															if (data == node.steps - 1) {
																	var lightMsg = {payload: {
																		brightness_pct: node.endBright,
																		rgb_color: colors[2],
																	}}
																	mlmsg = RED.util.cloneMessage(msg);
																	mlmsg.payload = "complete";
																	node.send([lightMsg, mlmsg]);
																	var now = new Date;
																	var splitDate = now.toDateString().split(' ');
																	var splitTime = now.toTimeString().split(':');
																	var goodDate = splitDate[1] + " " + splitDate[2] + ", " + splitTime[0] + ":" + splitTime[1];
																	node.status({
																			fill: "green",
																			shape: "dot",
																			text: "completed at " + goodDate,
																	});
																	timeout = null;
																	next("break");
															} else {
																	node.status({});
																	if ((data * node.nodeduration) <= node.nodemaxtimeout) {
																			var colorChange = [];
																			if(data <= tMid) {
																				for(let i=0;i<3;i++) {
																					colorChange[i] = colors[0][i] + data * d1[i];
																				}
																			} else {
																				for(let i=0;i<3;i++) {
																					colorChange[i] = colors[1][i] + (data-tMid) * d2[i];
																				}
																			}
																			var brightnessChange = 0;
																			if(node.transitionType == 'Exponential') {
																				if(node.startBright <= node.endBright) {
																					brightnessChange = Math.floor(node.startBright * Math.exp(exponB*data));
																				} else {
																					brightnessChange = node.startBright - Math.floor(node.endBright * Math.exp(exponB*data)) + node.endBright;
																				}
																			} else {
																				brightnessChange = Math.floor((node.endBright - node.startBright) / node.steps * data + node.startBright);
																			}
																			var lightMsg = {payload: {
																				brightness_pct: brightnessChange,
																				rgb_color: colorChange,
																			}};
																			node.send([lightMsg, null]);
																			timeout = null;
																			if (((data + 1) * node.nodeduration) > node.nodemaxtimeout) {
																					next("break");
																			} else {
																					next(undefined, data);
																			}
																	} else {
																			timeout = null;
																			next("break");
																	}
															}
													} else {
															timeout = null;
															next("break");
													}
											}, node.nodeduration);
									}, 0);
							}
					}
			});
			this.on("close", function () {
					stopped = false;
					if (timeout) {
							clearTimeout(timeout);
					}
					node.status({});
			});
	}
	RED.nodes.registerType("light-transition", LightTransition);
}