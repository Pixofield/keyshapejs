
# KeyshapeJS JavaScript Animation Library

KeyshapeJS is a lighweight JavaScript library to animate SVG documents.

The library can animate CSS properties in DOM elements. It is possible to animate
many elements and CSS properties in a compact form. Note that DOM attributes cannot be animated.

This library is used by the [Keyshape](https://www.keyshapeapp.com) animation software.

## Controlling animations exported by Keyshape

The [Keyshape app support page](https://www.keyshapeapp.com/support) has tutorials
showing how to control animations exported from Keyshape.

The the timeline can be controlled like this:

    KeyshapeJS.globalPlay();                // global play
    KeyshapeJS.globalPause();               // global pause
    KeyshapeJS.timelines()[0].time(1000);   // set the current time to 1000 millisecs

## Times and values

Animations must have at least two times, the start time and the end time. Times cannot be negative and
they must be in increasing order. Times are given in milliseconds.

There must be as many values as there are times. See below for details about accepted values.

Note that it is not possible to have "to" animations where the current DOM value is used as
the starting value. Only explicitly set starting values can be used.

## Animatable properties

Property names must be camelCase names, such as strokeWidth (not stroke-width).
Property names with a dash, such as stroke-width, are not supported.

The following table lists supported properties and values they accept.

| Property          | Accepted Values     |
| ----------------- | ------------------- |
| mpath             |  percentage (distance along a path)   |
| posX              |  number (gets converted to px)   |
| posY              |  number (gets converted to px)   |
| rotate            |  number (gets converted to px)   |
| scaleX            |  number (gets converted to px)   |
| scaleY            |  number (gets converted to px)   |
| skewX             |  number (gets converted to px)   |
| skewY             |  number (gets converted to px)   |
| anchorX           |  number (gets converted to px)   |
| anchorY           |  number (gets converted to px)   |
| opacity           |  number             |
| fillOpacity       |  number             |
| strokeOpacity     |  number             |
| fill              |  color: '#80ff40', '#80ff40ff', 'url("#ref")', 'none'   |
| stroke            |  color: '#80ff40', '#80ff40ff', 'url("#ref")', 'none'   |
| strokeDasharray   |  number list: '10 20'   |
| strokeDashoffset  |  number (gets converted to px)   |
| strokeWidth       |  number (gets converted to px)   |
| width             |  number (gets converted to px)   |
| height            |  number (gets converted to px)   |
| filter            |  filter value: 'blur(0px) drop-shadow(0px 0px 0px rgba(0,0,0,0))'   |
| d                 |  path data: 'path('M0,0L10,-30C15,-30,60,-25,60,-25L60,5Z')'   |

Only px length units can be used.

Note that the animated values of the d path data must have the same number of path commands
and they must have the same commands. Otherwise a discrete jump happens between the values.

In addition to these properties, objects can travel along motion paths. See below for details.

## Transforms

The transform of a SVG element can be animated. The position, rotation, scale, skew and anchor point
values can be animated individually with these properties: "posX", "posY", "rotate", "skewX", "skewY",
"scaleX", "scaleY", "anchorX", "anchorY". They are composited together in that order.

Rotation, scale and skew are performed around the anchor point. By default,
the anchor point is at the coordinate (0, 0). For rectangles, it is the top-left corner.
For ellipses, it is the center. For paths, it is the zero coordinate in the path data.

## Motion Paths

Objects can move along a motion path. The motion path is given as an SVG path
and the distance on that path (0-100%) is animated. The motionRotate property can be used
to make the object rotate to the direction of the path.

If a motion path animation and a transform animation exist for the same element,
then the motion path animation is performed first and the transform animation is applied after it.

Here's an example showing how to animate along a motion path:

    KeyshapeJS.animate("#elem",
        [{ property: "mpath",
           times: [ 0, 700, 1000 ],
           values: [ "0%", "100%", "50%" ],
           motionPath: "M0,0C0,30,30,30,30,0L100,0",
           motionRotate: true }]);

## Easing

The animate() method takes in an easing parameter. It is an array where each value corresponds
to the times and values. The possible values for easing are
the standard CSS easing functions: linear, cubic-bezier() and steps(). The default value
is "cubic-bezier(0, 0, 0.58, 1)" which is the same as CSS "ease-out".

    KeyshapeJS.animate("#elem",
        [{ property: "opacity", times: [ 0, 200, 400, 600 ], values: [ 0, 1, 0, 1 ],
           easing: [ "linear", "cubic-bezier(0.3, 0.4, 0.6, 0.7)", "steps(5, start)" ] }]);

Easing string values can be given as an array of numbers:

 * 'linear' - [ 0 ]
 * 'cubic-bezier(0.1, 0.2, 0.7, 0.8)' - [ 1, 0.1, 0.2, 0.7, 0.8 ]
 * 'steps(10, start)' - [ 2, 10 ]
 * 'steps(20, end)' - [ 3, 20 ]

Example:

    KeyshapeJS.animate("#elem",
        [{ property: "opacity", times: [ 0, 200, 400, 600 ], values: [ 0, 1, 0, 1 ],
           easing: [ [0], [1, 0.3, 0.4, 0.6, 0.7], [2, 5] ] }]);

## Iterations

An individual property animation can be repeated. The iteration count indicates how many
times the keyframes should be repeated. Only values greater than 1 will make the animation repeat.
Keyframes can be repeated forever by setting the iteration count to Infinity.

    KeyshapeJS.animate("#elem",
        [{ property: "posX", times: [0, 1000], values: [100, 200], iterations: 2 },
        [{ property: "opacity", times: [0, 500, 1000], values: [0, 1, 0], iterations: Infinity }]);

## States

A timeline object can be in "running", "finished", "paused" or "idle" state.

When play() is called, the state becomes "running". When a timeline reaches its end, the
state becomes "finished". The state is "paused" after pause() is called.
The state is "idle" if the timeline is not on the timeline list or it has not been played yet.

    var a = KeyshapeJS.animate("#elem", [{ property: "opacity", times: [0, 1000], values: [0, 1] }]);
    console.log("State: "+a.state()); // prints "running"

## Playback rate

The playback rate of a timeline object can be changed. The normal playback rate is 1, which
is the default value. The playback rate can be increased for faster playback. It can be negative
to make the timeline go backwards.

It can be set to zero to make the timeline stop. In that case,
the timeline is still running, but it just does not progress. It also keeps the animation engine
running, so it is preferable to pause timelines instead of setting the rate to zero. Pausing
stops the animation engine and does not consume processor cycles.

    var a = KeyshapeJS.animate("#elem", [{ property: "opacity", times: [0, 1000], values: [0, 1] }]);
    a.rate(2);              // play at double speed
    console.log(a.rate());  // prints "2"

## Timeline list

The animate() method adds timeline objects to a timeline list. The timeline list contains
all timelines which can be played and paused. The timelines are played in the order
given by the list. If two timelines target the same element and property, then the later one wins.

It is possible to remove and add timeline objects from/to the list.
Removing a timeline from the list changes its state to "idle" and it cannot be played anymore.
Adding a timeline to the list keeps its state as "idle" but it can be played or paused.

After timeline objects are removed from the list and they are no longer referenced by
any JavaScript variable, they will be freed by the JavaScript garbage collector.

    var list = KeyshapeJS.timelines();            // returns all timelines in the timeline list
    KeyshapeJS.remove(list[0]);                   // removes the first timeline object from the list
    KeyshapeJS.removeAll();                       // removes all timeline objects

## Options: autoplay, autoremove and markers

The animate() method takes in options for autoplay and autoremove. They are given as the last
parameter for the animate() method:

    KeyshapeJS.animate("#elem",
                 [{ property: "opacity", times: [0, 1000], values: [0, 1] }],
                 { autoplay: false, autoremove: false, markers: { "m1", 500 } });

The autoplay option can be used to make the timeline play immediately. Setting it to false
will keep the timeline in its "idle" state. The default is autoplay: true.

The autoremove option causes the timeline to be automatically removed from the timeline list
when it is finished. The default is autoremove: true.

Note: the autoremove: true feature may change in the future, so using it should be avoided.

Markers are predefined time values, which can be used as times in play(), pause(), range() and
time().

## Short key names

To make the animation data more compact, the keys given to the animate() method can be replaced
with a single letter versions:

 * p - property
 * t - time
 * v - value
 * e - easing
 * mp - motionPath

Example:

    KeyshapeJS.animate("#elem", [{ p: "opacity", t: [0, 1000], v: [0, 1], e: [ 'linear' ] }]);

## KeyshapeJS object methods

### KeyshapeJS.animate(target, animationValues, [target, animationValues,]* options)

Creates and returns a timeline object for the target element animating it using animationValues.
The timeline object is always automatically added the timeline list. It is possible to have multiple
targets and animationValues to pack many different animations into one object.

The target must be a CSS id selector or a DOM element.

The options parameter is an object with the following values:

 * autoplay: true or false, the default value is true. If this is true, then the timeline will
   start playing immediately. If it is false, then the timeline is in the "idle" state.
 * autoremove: true or false, the default value is true. If this is true, then the timeline is
   removed from the timeline list after it has finished (reached the end).
   The onfinish callback is called before the removal and if the callback changes the state to something
   else than "finished", then the removal does not happen. That way the onfinish callback
   has a chance to react before the removal happens.
 * markers: markers for the timeline

Examples:

    // animate an element with id "ball", moves its x from 100 to 200 in 1.5 seconds.
    var a = KeyshapeJS.animate("#ball",
                       [ { property: "posX", times: [ 0, 1500 ], values: [ 100, 200 ] } ]);

    // animate an element with id "myId", moves its y from 50 to 120 in 1.5 seconds
    // after a 1 second delay.
    KeyshapeJS.animate(document.getElementById("myId"),
               [ { property: "posY", times: [ 1000, 2500 ], values: [ 50, 120 ] } ]);

    // animate with options
    KeyshapeJS.animate(document.getElementById("myId"),
               [ { property: "posY", times: [ 1000, 2500 ], values: [ 50, 120 ] } ],
               { autoplay: false, autoremove: false, markers: { "m1", 500 } });

### KeyshapeJS.globalPlay()

Returns: The KeyshapeJS object is returned for method chaining.

Changes the global timeline to running. Any timeline in the "running" state will start progressing.

### KeyshapeJS.globalPause()

Returns: The KeyshapeJS object is returned for method chaining.

Changes the global timeline to paused. All timelines stop progressing, but their states are not changed.

### KeyshapeJS.globalState()

Returns "running" if the global timeline is playing or "paused" if the global timeline is paused.

### KeyshapeJS.timelines()

Returns: an array of timeline objects which are in the timeline list.

    var tls = KeyshapeJS.timelines();

### KeyshapeJS.add(timeline)

Returns: The KeyshapeJS object is returned for method chaining.

Adds a timeline object to the end of the timeline list. If the timeline object is already
in the list, then this method does nothing.

Example:

    KeyshapeJS.add(tl);

### KeyshapeJS.remove(timeline)

Returns: The KeyshapeJS object is returned for method chaining.

Removes an timeline object from the timeline list. If the timeline object is not in
the timeline list, then this method does nothing.

Note: the remove() method may change in the future, so using it should be avoided.

    var tls = KeyshapeJS.timelines();
    KeyshapeJS.remove(tls[0]);        // removes the first timeline object
    KeyshapeJS.add(tls[0]);           // adds the removed object back to the end of the list

### KeyshapeJS.removeAll()

Returns: The KeyshapeJS object is returned for method chaining.

Removes all timeline objects from the timeline list.

    KeyshapeJS.removeAll();     // removes all timeline objects

Note: the removeAll() method may change in the future, so using it should be avoided.

### KeyshapeJS.version

A string property containing the current library version number.

    console.log("Version is: "+KeyshapeJS.version);

## Timeline object methods

### timeline.play(millisecs|marker)

Returns: The timeline object is returned for method chaining.

Starts playing the timeline from the current time or the given millisecs time, if the parameter
is given and it is not null. The state of the timeline is changed to "running".

It is possible to pass in a marker name to play from the marker's time.

Throws an exception if the timeline has not been added to the timeline list.

Note: If the playback rate has been set to zero, then the state is changed to "running",
but the timeline does not progress.

    tl.play();                  // starts playing the timeline
    tl.play(1800);              // starts playing the timeline at 1.8 seconds
    tl.play("my-marker");       // starts playing the timeline from the marker time

### timeline.pause(millisecs|marker)

Returns: The timeline object is returned for method chaining.

Pauses the timeline. If the millisecs parameter is given, then the current time is set to it.
The state of the timeline is changed to "paused".

It is possible to pass in a marker name to use its time.

Throws an exception if the timeline has not been added to the timeline list.

    tl.pause();             // pauses the timeline at the current time
    tl.pause(1800);         // pauses the timeline and sets the time to 1.8 seconds
    tl.pause("my-marker");  // pauses the timeline and sets the time to the marker's time

### timeline.time(millisecs|marker)

Gets or sets the current time.

Returns: The current time or the timeline object for method chaining.

Throws an exception if the timeline has not been added to the timeline list.

If no parameter is given, then returns the current time. If the timeline object is not in
the timeline list or its state is "idle", then null is returned.

If the parameter is given, then the current time is set to it.

It is possible to pass in a marker name to use its time.

    var millisecs = tl.time();    // gets the current time of the 'tl' timeline object
    tl.time(2300);                // sets the current time to 2.3 seconds
    tl.time("my-marker");         // sets the current time to the marker's time

### timeline.state()

Returns "idle" if the timeline has no effect,
"running" if the timeline is playing, "paused" if the timeline is paused and
"finished" if the timeline has reached its end.

If the playback rate is set to zero while the timeline is playing, then the current time
is not progressing, but this method still returns "running".

Timelines which are not in the timeline list always return "idle".

    var tl = KeyshapeJS.animate("#elem", [{ property: "opacity", times: [0, 1000], values: [0, 1] }]);
    tl.pause();
    console.log(tl.state());      // returns "paused"

### timeline.duration()

Returns the duration of the timeline in milliseconds. If the timeline has infinite
iterations, then `Infinity` is returned. This can also return 0 for zero duration timelines.
The returned value is the time of the keyframe animations including any iterations.
Loop counts and the play range do not affect it.

    var millisecs = tl.duration();
    var percentage = tl.time() / tl.duration();
    // note: percentage will be zero if duration() is Infinity
    // and will be Infinity if duration() is zero

### timeline.rate(value)

Returns: The current playback rate or the timeline object for method chaining.

Gets the current playback rate if no parameter is given. Sets the playback rate if the value is
given and returns the timeline object for method chaining.

The rate value can be negative to play the timeline backwards. The rate value can be zero.
In that case, the timeline does not progress, but its state is still "running".

    tl.rate(1);           // normal playback rate
    tl.rate(2);           // double playback rate
    tl.rate(-1);          // plays the timeline backwards
    var r = tl.rate();    // returns the current playback rate

### timeline.range(inTime, outTime)

Returns: The current play range or the timeline object for method chaining.

Gets or sets the play range for the timeline. If no parameters are given, then
the current play range is returned as an object with two values: { in: in-time, out: out-time }.

If parameters are given, then the range is set. If only the inTime is given, then duration() is
used as the outTime.

The in and out times must not be negative and the out time must be greater than the in time,
otherwise an exception is thrown.

It is possible to pass in marker names as inTime and outTime.

The play range is used to detect when a timeline is finished or looped. The play range affects
the timeline only if the timeline is "running". If the timeline's time
becomes greater than the range out time, then the timeline is either finished or looped.
A finished timeline will stop at the range out time. A looped timeline will jump
to the range in time. During reverse playback, the in time is used in place of the out time.

The play range does not have any effect if the timeline is not "running". The in time
affects only looped timelines. Non-looped timelines are stopped at the out time and
the in time is ignored.

Examples:

    var r = tl.range();                 // returns the current play range
    tl.range(100, 1200);                // sets the play range to be between 0.1 and 1.2 secs
    tl.range(100);                      // sets the play range to [100, duration()]
    tl.range("mark1", "mark2");         // the play range uses the times defined by the markers

### timeline.loop(loopCount)

Returns: The current loop count or the timeline object for method chaining.

Gets or sets the loop count for the timeline. If no parameter is given, then this returns
an object with a 'count' property, which indicates how many loop counts are left to go.

If the loopCount is given, then it is used as the current loop count. If it is
true or Infinity, then the play range will be looped forever. Zero disables looping.
Negative values are the same as zero.

The loop count indicates how many times the playback jumps from the end of the play range to
the start of the play range. No jumps are made if the loop count is zero. If the loop count is
greater than zero, then a jump is made and the loop count is decremented by one. For instance,
setting the loop count to 2 means that the playback jumps twice from the end to the start.

Examples:

    tl.loop(true);          // loops forever
    tl.loop(Infinity);      // loops forever
    tl.loop(5);             // jumps 5 times
    var lc = tl.loop();     // returns { count: 5 }

### timeline.markers(markermap)

Returns: All time markers for the timeline or the timeline object for method chaining.

Gets or sets the markers for the timeline. If no parameter is given, then this returns
an object containing all time markers for the timeline.

If markermap is given, then its values replace markers in the timeline.

Examples:

    var m = tl.markers();   // returns an object containing markers, e.g. { "m1": 1000, "m2": 2000 }
    tl.markers({ "newm1": 2000, "marker2": 5000 }); // sets new markers

### timeline.marker(name)

Returns: The time for the given marker name or undefined if the marker is not found.

Gets the given marker's time in milliseconds.

Example:

    var timems = tl.marker("my-marker");          // gets the time for "my-marker"

### Callback: onfinish

The onfinish callback is called when a non-looping timeline reaches its play range out time
(the in time for reverse playback).
The onfinish callback is only called if the timeline is "running". Paused and idle timelines never
have this callback called. 'this' is set to the finished timeline.

    var tl = KeyshapeJS.animate("#elem", [{ property: "opacity", times: [0, 1000], values: [0, 1] }],
                          { autoplay: false });
    tl.onfinish = function() { console.log("Done: "+this); } // 'this' is set to the timeline tl
    tl.play();

    tl.onfinish = undefined; // to remove callback

### Callback: onloop

The onloop callback is called when a timeline is looped.
The onloop callback is only called if the timeline is "running". Paused and idle timelines never
have this callback called. 'this' is set to the looped timeline.

The current time is set to the play range in point before the onloop  callback is called. To pause
the timeline at the end of the range, call `tl.pause(tl.range().out)` in the callback.

    var tl = KeyshapeJS.animate("#elem", [{ property: "opacity", times: [0, 1000], values: [0, 1] }],
                          { autoplay: false });
    tl.onloop = function() { console.log("Looped: "+this); } // gets called twice, 'this' is tl
    tl.onfinish = function() { console.log("Done!"); }       // gets called once
    tl.loop(2).play(0);

## Examples

### Animate the position X from 100px to 200px

    var tl = KeyshapeJS.animate("#elem", [{ property: "posX", times: [0, 1000], values: [100, 200] }]);

### Create a line animation

    var pathElem = document.getElementById("my-path");
    var len = pathElem.getTotalLength();
    pathElem.setAttribute("stroke-dasharray", len);
    var tl = KeyshapeJS.animate(pathElem, [{
        property: "strokeDashoffset", times: [0, 1000], values: [len, 0] }]);

### Create a shape animation

There must be the same amount of path commands and the commands must be the same, otherwise
a discrete animation is shown.

    KeyshapeJS.animate("#my-path",[{ property: 'd',t: [0,1000], v:[
        "path('M0,0C0,0,20,-20,20,-20C20,-20,40,0,40,0C40,0,20,20,20,20C20,20,0,0,0,0Z')",
        "path('M0,0C12,0,20,-8,20,-20C20,-8,28,0,40,0C28,0,20,8,20,20C20,8,12,0,0,0Z')"]
    }]);

## Standalone Usage

It is possible to use the library as a standalone animation engine.

Download the library and include the KeyshapeJS JavaScript library in the SVG file.

    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ...>
        <script xlink:href="keyshapejs.js"/>
        ...

Here's an example animating the opacity property of an element with the id "elem".

    <rect id="elem" width="100" height="100"/>
    <script>
        var tl = KeyshapeJS.animate("#elem", [{ property: "opacity", times: [0, 1000], values: [0, 1] }]);
    </script>

The animate() method returns a timeline object, which can be paused and
its time can be set. All time values are in milliseconds.

    tl.pause();      // pauses the animation
    tl.time(2000);   // set the time to 2.0 seconds
    tl.play();       // plays the animation

The animate() method can animate multiple elements with different keyframes.
This animates two elements:

    KeyshapeJS.animate(
        "#elem1", [{ property: "opacity", times: [0, 1000], values: [0, 1] }],
        "#elem2", [{ property: "strokeWidth", times: [1000, 1500], values: [1, 10] }],
    );

Multiple properties can be animated. This animates stroke and stroke width of one element:

    KeyshapeJS.animate("#elem1",
        [{ property: "stroke", times: [500, 1200], values: [ "#000000", "#808080" ] },
         { property: "strokeWidth", times: [600, 1300], values: [1, 10] }]);

The above can be combined to animate many properties in multiple elements.

## Browser restrictions

Safari throttles the requestAnimationFrame callback heavily if the animated document is not visible
on the page. It means that time(), state(), and onfinish are affected and have up-to-date
information only every 10 seconds.

Safari may also drop the animation frame rate from 60 to 30 in power saving mode.

## Building

The minified version has been created with the Google Closure minifier using the following command:

    java -jar compiler-latest/closure-compiler-v20170806.jar --compilation_level ADVANCED_OPTIMIZATIONS --js keyshapejs.js --js_output_file keyshapejs.min.js --externs extern-keyshapejs.js

## Versioning

The library follows the [Semantic Versioning](http://semver.org). The version number is made of
three numbers (e.g., 1.3.6):

 * The first number is incremented if the public API has backwards incompatible changes.
 * The second number is incremented if there are new features, but the public API is still backwards
   compatible.
 * The third number is incremented if there are only bug fixes.

## License

The MIT license. See the LICENSE file for the full license text.

The minified JavaScript file has a single line license text which is sufficient
when redistributing it.

    /* KeyshapeJS v1.1.1 (c) 2018-2021 Pixofield Ltd | pixofield.com/keyshapejs/mit-license */
