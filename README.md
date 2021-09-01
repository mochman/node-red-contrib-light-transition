# Light Transition for node-red

----------------------------

## **Overview:**

This node takes in a starting color and brightness and slowly changes them to meet an ending color and brightness.

This project is based on **[node-red-contrib-looptimer-advanced](https://github.com/Haxiboy/node-red-contrib-looptimer-advanced)** and some extra code to slowly change the brightness and color of a light over a programmable time.

This node was created to help with lights in Home Assistant that don't work with the built in _transition_ command.  The node will output a ```msg.payload``` containing:
``` 
{
  "brightness_pct": <1-100>,
  "rgb_color": [<0-255>,<0-255>,<0-255>],
  "color_temp": <Integer>
}
```

that can be used with a call service node to incrementally change the color and brightness of the light.

## **Installation:**
> npm install node-red-contrib-light-transition

## **Configuration:**
This node can be configured manually or by passing it a specific payload.  The manual settings are:
- **Total Time** - Amount of time you want the light to take to get from the beginning color/brightness to the end.
- **\# of steps** - Total amount of increments to take to get from the beginging to the end. A higher number will make for a smoother transition.
- **Starting color** - Initial color of the light.
- **Intermediate color** - The color that will be transitioned through from beginning to end.
- **Ending color** - The final color the light will be at the end of the Total Time.
- **Starting mireds** - The initial mired value (called color_temp in Home Assistant light entities).
- **Ending mireds** - The final mired value.
- **Starting Brightness** - Initial brightness of the light.
- **Ending Brightness** - Final brightness ot the light.
- **Transition Style** - How the brightness changes over time.
  - **Linear** - Changes the brightness the same from beginning to end.
  - **Exponential** - Changes the brightess slowly at the begining then with bigger increments towards the end of the loop.

The node can also be configured by sending it a specific ```msg.transition``` object:
``` 
{
  "duration": 15,             //Total Time
  "units": "Minute",          //Can be "Second", "Minute", or "Hour"
  "steps": 30,                //# of steps
  "startRGB": '#ff0000',      //RGB color to start from
  "transitionRGB": '#ffff00', //RGB color to transition through
  "endRGB": '#ffffff',        //RGB color to end at
  "startMired": 160,          //Mired value to begin at
  "endMired": 600,            //Mired value to end at
  "startBright": 1,           //Starting brightness percentage
  "endBright": 100,           //Ending brightness percentage
  "transitionType": "Linear"  //Can be "Linear" or "Exponential"
}
```
Any time a ```msg.transition``` is sent to the node, the settings are changed and the loop is started from the beginning again.

This node will stop running when it has reached the last step.  It will send a ```msg.payload``` of ```complete``` out of the second output on the node.
You can also manually stop the node by sending a ```msg.payload``` of ```stop``` or ```STOP```.  The node will end its loop and send a ```msg.payload``` of ```stopped``` out of the second output.

## **Notes**
- The amount of steps this node takes to get from the starting RGB color to the transition color may not be the same as from the transition color to the final color.  This uses the ["redmean" distance approximation](https://en.wikipedia.org/wiki/Color_difference#sRGB) to find the "distance" between the color changes and scales the transition as appropriate.
- Using the "Exponential" transition type with a small number of "steps" will cause large brightness changes near the end.  It's best to use a higher number of steps to make sure the brightness transition is smooth.

## **Changelog**
v1.1.0 (2 Sep 21) - Added color_temp(mired) transition & fixed linear brightness_pct formula.

v1.0.1 (1 Sep 21) - Icon fix

v1.0.0 (1 Sep 21) - Initial release
