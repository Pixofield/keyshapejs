/** @license KeyshapeJS v1.0.1 (c) 2018-2019 Pixofield Ltd | pixofield.com/keyshapejs/mit-license */
window['KeyshapeJS'] = (function () {

function ERR(msg) { return Error(msg); }
var NOT_IN_LIST_EXCEPTION = ERR("Not in timeline list");

// Properties with predefined names and types
var P_MOTION_DISTANCE   = 0;
var P_POSITIONX         = 1;
var P_POSITIONY         = 2;
var P_ROTATE            = 6;
var P_SKEWX             = 7;
var P_SKEWY             = 8;
var P_SCALEX            = 10;
var P_SCALEY            = 11;
var P_ANCHORX           = 13;
var P_ANCHORY           = 14;

// names for animate()
var transformProps = [ "mpath", "posX", "posY", "", "", "", "rotate",
                       "skewX", "skewY", "", "scaleX", "scaleY", "", "anchorX", "anchorY" ];

// CSS transform names
var transformNames = [ "", "translate", "translate", "", "", "", "rotate",
                       "skewX", "skewY",  "", "scale", "scale", "", "translate", "translate" ];

// Filter function types
var FILTER_NONE                  = 0;
var FILTER_URL                   = 1;
var FILTER_BLUR                  = 2;
var FILTER_BRIGHTNESS            = 3;
var FILTER_CONTRAST              = 4;
var FILTER_DROPSHADOW            = 5;
var FILTER_GRAYSCALE             = 6;
var FILTER_HUEROTATE             = 7;
var FILTER_INVERT                = 8;
var FILTER_OPACITY               = 9;
var FILTER_SATURATE              = 10;
var FILTER_SEPIA                 = 11;

// Filter function names, the order matching the types
var filterNames = [ "none", "url", "blur", "brightness", "contrast", "drop-shadow",
                    "grayscale", "hue-rotate", "invert", "opacity", "saturate", "sepia" ];

// Indexes to pdata internal array
var INX_PROP            = 0;
var INX_FLAGS           = 1;
var INX_STARTTIME       = 2;
var INX_ITERATIONDUR    = 3; // begin+iteration dur = iteration end
var INX_TIMES           = 4;
var INX_VALUES          = 5;
var INX_EASING          = 6;
var INX_ITERATIONS      = 7;
var INX_MPATH           = 8;

// INX_MPATH and elements with motion path have this data
var MPATH_AUTOROTATE    = 0;
var MPATH_ELEMENT       = 1;
var MPATH_PATHLENGTH    = 2;

// values for INX_FLAGS
// bits 0-1: target types
var FLAG_TARGET_CSS_PROPERTY    = 0x00;
var FLAG_TARGET_ATTRIBUTE       = 0x01;
// bits 4-7: property types
var FLAG_TYPE_STRING            = 0x00;
var FLAG_TYPE_NUMBER            = 0x10;
var FLAG_TYPE_LENGTH            = 0x20;
var FLAG_TYPE_COLOR             = 0x30;
var FLAG_TYPE_LENGTH_LIST       = 0x40;
var FLAG_TYPE_FILTER            = 0x50;
var FLAG_TYPE_PATH              = 0x60;

// Timing function values
var TIMING_FN_LINEAR     = 0;
var TIMING_FN_CUBIC      = 1;
var TIMING_FN_STEP_START = 2;
var TIMING_FN_STEP_END   = 3;

// play states
var STATE_IDLE = "idle";
var STATE_PAUSED = "paused";
var STATE_RUNNING = "running";
var STATE_FINISHED = "finished";

// pending callback constants
var PENDING_NONE = 0;
var PENDING_ONFINISH = 1;
var PENDING_ONLOOP = 2;

var reqAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame || null;
if (!reqAnimationFrame) { // IE9 needs setTimeout()
    reqAnimationFrame = function(cb) {
        window.setTimeout(cb, 16);
    };
}

function isSet(value)
{
    return typeof value !== "undefined";
}

function startsWith(str, s)
{
    return str && str.indexOf(s) == 0;
}

function copyArray(arr)
{
    return arr.slice();
}

function copyMap(map)
{
    var res = {};
    for (var key in map) {
        res[key] = map[key];
    }
    return res;
}

function removeItemFromArray(arr, item)
{
    var i = arr.indexOf(item);
    if (i > -1) {
        arr.splice(i, 1);
    }
}

function checkIsFinite(value)
{
    if (!isFinite(value)) {
        throw ERR("Non-finite value");
    }
}

function setAttr(elem, attrName, val)
{
    elem.setAttribute(attrName, val);
}

// properties with special flags
var propertyData = {
    "d": FLAG_TARGET_ATTRIBUTE | FLAG_TYPE_PATH,
    "fill": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_COLOR,
    "fillOpacity": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_NUMBER,
    "filter": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_FILTER,
    "height": FLAG_TARGET_ATTRIBUTE | FLAG_TYPE_LENGTH,
    "opacity": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_NUMBER,
    "offsetDistance": FLAG_TARGET_ATTRIBUTE | FLAG_TYPE_LENGTH,
    "stroke": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_COLOR,
    "strokeDasharray": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_LENGTH_LIST,
    "strokeDashoffset": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_LENGTH,
    "strokeOpacity": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_NUMBER,
    "strokeWidth": FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_LENGTH,
    "transform": FLAG_TARGET_ATTRIBUTE | FLAG_TYPE_STRING,
    "width": FLAG_TARGET_ATTRIBUTE | FLAG_TYPE_LENGTH
};

function isValidProperty(prop)
{
    // is it a string without a dash
    return typeof prop == "string" && prop.indexOf("-") == -1 && prop !== "" &&
            (propertyData[prop] > 0 || transformProps.indexOf(prop) >= 0);
}

// returns property type for the given property and its value
function propertyType(flags)
{
    return flags & 0xf0;
}

var allCssProps = window.getComputedStyle(document.documentElement);

function propertyFlags(prop)
{
    if (prop <= P_ANCHORY) {
        return FLAG_TARGET_CSS_PROPERTY | FLAG_TYPE_NUMBER;
    }
    var flags = propertyData[prop];
    if (!flags) {
        // check if it is a css property or an attribute
        if (isSet(allCssProps[prop])) {
            flags = FLAG_TARGET_CSS_PROPERTY;
            flags |= (prop.toLowerCase().indexOf("color") == prop.length-5 ? FLAG_TYPE_COLOR
                                                                           : FLAG_TYPE_STRING);
        } else {
            flags = FLAG_TARGET_ATTRIBUTE | FLAG_TYPE_STRING;
        }
    }
    return flags;
}

function cubeRoot(a)
{
    return a >= 0 ? Math.pow(a, 1/3) : -Math.pow(-a, 1/3);
}

// Solves quadratic equation ax^2 + bx + c = 0 and returns result between [0, 1]
function solveRestrictedQuadraticEquation(a, b, c)
{
    if (a == 0) return -c/b;

    var sqrtDisc = Math.sqrt(b*b - 4.0*a*c);
    var x = (-b + sqrtDisc) / (2.0*a);
    if (x >= 0 && x <= 1) return x;

    x = (-b - sqrtDisc) / (2.0*a);
    if (x >= 0 && x <= 1) return x;

    // NOTREACHED
    return 0;
}

// tested manually (values from http://www.1728.org/cubic2.htm):
//    solveRestrictedCubicEquation(2, -4, -22, 24); x1=4, x2=-3, x3=1
//    solveRestrictedCubicEquation(3, -10, 14, 27); x1=-1, x2=x3=2.16
//    solveRestrictedCubicEquation(1, 6, 12, 8); x1=x2=x3=-2

// Solves cubic equation ax^3 + bx^2 + cx + d = 0 and returns the real part of the result
// between [0, 1]
function solveRestrictedCubicEquation(a, b, c, d)
{
  // Based on cubic equation solver
  // theory: http://www.1728.org/cubic2.htm

    if (a == 0) {
        return solveRestrictedQuadraticEquation(b, c, d);
    }
    var f = c/a - ((b*b)/(a*a))/3.0;
    var g = ((b*b*b)/(a*a*a))/13.5 - b*c/(a*a)/3.0 + d/a;
    var h = g*g/4.0 + f*f*f/27.0;
    var p = -b/(3.0*a);

    if (h <= 0) { // 3 real roots
        if (f == 0 && g == 0) {   // all roots equal
            // this code avoids possible divide by zero error when evaluating k below
            return -cubeRoot(d/a);  // x1, x2, x3, i = 0

        } else { // 3 real unequal roots
            var j = Math.sqrt(g*g/4.0 - h);
            var k = Math.acos(-g/2.0/j);
            var m = Math.cos(k/3.0);
            var n = Math.sqrt(3.0)*Math.sin(k/3.0);
            j = cubeRoot(j);
            var x = 2.0*j*m + p;    // x1, i=0
            if (x >= 0 && x <= 1) return x;

            x = -j*(m+n) + p;       // x2, i=0
            if (x >= 0 && x <= 1) return x;

            x = j*(n-m) + p;        // x3, i=0
            if (x >= 0 && x <= 1) return x;
        }

    } else { // 2 complex roots
        var r = -g/2.0 + Math.sqrt(h);
        var s = cubeRoot(r);
        var t = -g/2.0 - Math.sqrt(h);
        var u = cubeRoot(t);
        var xx = s + u + p;            // x1, i = 0
        if (xx >= 0 && xx <= 1) return xx;

        xx = -(s + u)/2.0 + p;         // x2, x3, i = +-(s - u)*sqrt(3.0)/2
        if (xx >= 0 && xx <= 1) return xx;
    }
    // NOTREACHED
    return 0;
}

// calculate y for x on a cubic bezier defined by cbdata [CB, p1x, p1y, p2x, p2y]
function cubicBezierY(cbdata, x)
{
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // calculate t for x on a cubic bezier 0.0, x1, x2, 1.0
    var x1 = cbdata[1];
    var x2 = cbdata[3];
    var a = 3*x1 - 3*x2 + 1;
    var b = -6*x1 + 3*x2;
    var c = 3*x1;
    var d = - x;
    var t = solveRestrictedCubicEquation(a, b, c, d);

    // get cubic curve y coordinate for t, p1y and p2y (p0y = 0 and p3y = 1)
    return /*(1-t)*(1-t)*(1-t)*0 +*/ 3*t*(1-t)*(1-t)*cbdata[2] + 3*t*t*(1-t)*cbdata[4] + t*t*t;
}

function getCurrentTimeIndex(simpleTime, pdata)
{
    var starttime = pdata[INX_STARTTIME];
    simpleTime += starttime;
    var tlen = pdata[INX_TIMES].length;
    for (var i = 0; i < tlen; ++i) {
        if (simpleTime < pdata[INX_TIMES][i]) {
            return i;
        }
    }
    return tlen-1;
}

// converts the given raw value to an svg value (possibly a string)
function convertToSvgValue(type, val)
{
    // non-numeric colors are returned as such
    if (type == FLAG_TYPE_COLOR && typeof val === 'number') {
        return "rgba("+(val>>>24)+","+((val>>>16)&255)+","+((val>>>8)&255)+","+((val&255)/255)+")";

    } else if (type == FLAG_TYPE_LENGTH_LIST) {
        val = val.map(function(v) { return v+"px"; });
        return val.join(",");

    } else if (type == FLAG_TYPE_PATH) {
        var path = "";
        var len = val.length;
        for (var ip = 0; ip < len; ip += 2) {
            path += val[ip];             // command
            path += val[ip+1].join(','); // values
        }
        return path;

    } else if (type == FLAG_TYPE_FILTER) {
        if (val[0] == FILTER_NONE) {
            return "none";
        }
        var filters = "";
        var flen = val.length;
        var i = 0;
        while (i < flen) {
            filters += filterNames[val[i]];
            if (val[i] == FILTER_URL) {
                filters += "("+val[i+1]+") ";
            } else if (val[i] == FILTER_DROPSHADOW) {
                var r = val[i+4] >>> 24; // triple >>> to get unsigned shift
                var g = (val[i+4] >> 16) & 255;
                var b = (val[i+4] >> 8) & 255;
                var a = val[i+4] & 255;
                filters += "("+val[i+1]+"px "+val[i+2]+"px "+val[i+3]+"px rgba("+
                        r+","+g+","+b+","+(a/255)+")"+") ";
                i += 3;
            } else if (val[i] == FILTER_BLUR) {
                filters += "("+val[i+1]+"px) ";
            } else if (val[i] == FILTER_HUEROTATE) {
                filters += "("+val[i+1]+"deg) ";
            } else { // other filters
                // clamp negative values, like all browsers seems to be doing for these values
                filters += "("+(val[i+1]< 0 ? 0 : val[i+1])+") ";
            }
            i += 2;
        }
        return filters;
    } else if (type == FLAG_TYPE_LENGTH) {
        return val+"px";
    }
    return val;
}

function clampColor(n)
{
    return n <= 0 ? 0 : n >= 255 ? 255 : n;
}

// interpolates between the given values v1 and v2 using t [0, 1]
function interpolate(type, v1, v2, t)
{
    if (type == FLAG_TYPE_NUMBER || type == FLAG_TYPE_LENGTH) { // number or length
        return (v2-v1) * t + v1;
    }
    if (type == FLAG_TYPE_STRING) {
        return t < 0.5 ? v1 : v2;
    }
    if (type == FLAG_TYPE_COLOR) {
        if (typeof v1 === 'number' && typeof v2 === 'number') {
            // interpolate rgba colors
            var nt = 1-t;
            var r = nt*(v1>>>24) + t*(v2>>>24);
            var g = nt*((v1>>>16)&255) + t*((v2>>>16)&255);
            var b = nt*((v1>>>8)&255) + t*((v2>>>8)&255);
            var a = nt*(v1&255) + t*(v2&255);
            return (clampColor(r)<<24 | clampColor(g)<<16 | clampColor(b)<<8 | clampColor(a)) >>> 0;
        }
        // gradients are like strings
        return t < 0.5 ? v1 : v2;
    }
    if (type == FLAG_TYPE_LENGTH_LIST) {
        // if either is empty ("none"), then use value zero
        if (v1.length == 0) {
            v1 = [ 0 ];
        }
        if (v2.length == 0) {
            v2 = [ 0 ];
        }
        var reslen = v1.length;
        // different sizes will create from*to items to match browser behaviour
        if (v1.length != v2.length) {
            reslen = v1.length * v2.length;
        }
        var res = [];
        for (var i = 0; i < reslen; ++i) {
            var fromVal = v1[i % v1.length];
            var toVal = v2[i % v2.length];
            var r = (toVal - fromVal) * t + fromVal;
            if (r < 0) { r = 0; }
            res.push(r);
        }
        return res;
    }
    if (type == FLAG_TYPE_PATH) {
        if (v1.length != v2.length) {
            return t < 0.5 ? v1 : v2;
        }
        var reslen = v1.length;
        var res = [];
        for (var i = 0; i < reslen; i += 2) {
            if (v1[i] !== v2[i]) { // commands must match
                return t < 0.5 ? v1 : v2;
            }
            res[i] = v1[i];
            // coordinate data
            res[i+1] = [];
            for (var j = 0; j < v1[i+1].length; ++j) {
                var newval = (v2[i+1][j]-v1[i+1][j]) * t + v1[i+1][j];
                res[i+1].push(newval);
            }
        }
        return res;
    }
    if (type == FLAG_TYPE_FILTER) {
        var reslen = v1.length;
        if (reslen != v2.length) {
            // TODO: extra filters should be appended to the shorter list
            return t < 0.5 ? v1 : v2;
        }
        var res = [];
        var i = 0;
        while (i < reslen) {
            if (v1[i] != v2[i] || v1[i] == FILTER_URL) {
                return t < 0.5 ? v1 : v2;
            }
            res[i] = v1[i];
            res[i+1] = (v2[i+1]-v1[i+1]) * t + v1[i+1];
            if (v1[i] == FILTER_DROPSHADOW) { // multiple values and color for drop-shadow
                res[i+2] = (v2[i+2]-v1[i+2]) * t + v1[i+2];
                res[i+3] = (v2[i+3]-v1[i+3]) * t + v1[i+3];
                // interpolate rgba colors
                var nt = 1-t;
                var c1 = v1[i+4];
                var c2 = v2[i+4];
                var r = nt*(c1>>>24) + t*(c2>>>24); // triple >>> to get unsigned shift
                var g = nt*((c1>>16)&255) + t*((c2>>16)&255);
                var b = nt*((c1>>8)&255) + t*((c2>>8)&255);
                var a = nt*(c1&255) + t*(c2&255);
                res[i+4] = (clampColor(g)<<16 | clampColor(b)<<8 |
                            clampColor(a)) + (clampColor(r)|0)*16777216;
                i += 3;
            }
            i += 2;
        }
        return res;
    }
    return 0;
}

// returns an interpolated raw value for the given pdata
function animateProperty(simpleTime, pdata)
{
    var ti = getCurrentTimeIndex(simpleTime, pdata);
    var starttime = pdata[INX_STARTTIME];
    var t1 = pdata[INX_TIMES][ti-1] - starttime;
    var t2 = pdata[INX_TIMES][ti] - starttime;
    var t = (simpleTime-t1) / (t2-t1);

    // apply easing (timing function) if needed
    if (pdata[INX_EASING] && pdata[INX_EASING].length > ti-1) {
        var v = pdata[INX_EASING][ti-1];
        // TIMING_FN_LINEAR doesn't need processing, t = t
        if (v[0] == TIMING_FN_CUBIC) {
            t = cubicBezierY(v, t);

        } else if (v[0] == TIMING_FN_STEP_START) {
            var steps = v[1];
            t = Math.ceil(t*steps)/steps;

        } else if (v[0] == TIMING_FN_STEP_END) {
            var steps = v[1];
            t = Math.floor(t*steps)/steps;
        }
    }
    var v1 = pdata[INX_VALUES][ti-1];
    var v2 = pdata[INX_VALUES][ti];
    var rawval = interpolate(propertyType(pdata[INX_FLAGS]), v1, v2, t);
    return rawval;
}

// true if the requestAnimationFrame is running
var isTicking = false;

// timeline time
var sysTimelineTime = new Date().getTime();

// timeline hold time after global pause, undefined if not paused
var holdTimelineTime;

// timeline adjust time, which is affected by global pause
var sysTimelineTimeDrift = 0;

// all timelines
var globalTimelineList = [];

// list of pending callbacks
// values: [ timeline, PENDING_ONFINISH ] or [ timeline, PENDING_ONLOOP ]
var pendingCallbacks = [];

function updateSysTimelineTime()
{
    if (holdTimelineTime) {
        return;
    }
    sysTimelineTime = new Date().getTime() + sysTimelineTimeDrift;
}

function updateAllAnimations(mainUpdate)
{
    if (!mainUpdate && isTicking) { // no update if mainloop will do it
        return;
    }
    var hasActiveTimelines = false;
    for (var myi = 0; myi < globalTimelineList.length; ++myi) {
        var curTl = globalTimelineList[myi];
        if (curTl._updateValues(mainUpdate)) {
            hasActiveTimelines = true;
        }
    }
    if (mainUpdate) {
        // call pending callbacks (onloop and onfinish) and do autoremove for finished ones
        while (pendingCallbacks.length > 0) {
            var item = pendingCallbacks.shift();
            var tl = item[0];
            if (item[1] == PENDING_ONFINISH) {
                if (tl['onfinish']) {
                    // calling as a method sets 'this' to tl
                    tl['onfinish']();
                    // keep hasActiveTimelines for one more requestAnimationFrame so that
                    // play() etc. in onfinish callback keeps the timeline running
                    hasActiveTimelines = true;
                }
                tl._performAutoRemove();

            } else if (item[1] == PENDING_ONLOOP) {
                if (tl['onloop']) {
                    // calling as a method sets 'this' to tl
                    tl['onloop']();
                }
            }
        }
    }
    return hasActiveTimelines;
}

// mainloop animates elements in DOM and calls again reqAnimationFrame if needed
function mainloop()
{
    updateSysTimelineTime();
    // isTicking can be set to false or true below
    // note: onfinish callback may add active animations, in that case isTicking should stay true
    if (updateAllAnimations(true) && !holdTimelineTime) {
        isTicking = true;
        reqAnimationFrame(mainloop);
    } else {
        isTicking = false;
    }
};

function startTicking()
{
    if (!isTicking) {
        isTicking = true;
        reqAnimationFrame(mainloop);
    }
};

function parseFloatList(str, separator)
{
    var parts = str.split(separator);
    var res = [];
    parts.forEach(function(v) { res.push(parseFloat(v)); });
    return res;
}

function parseCommaSeparated(str)
{
    // IE uses space as separator in transform attribute, so convert them to comma before parsing
    if (str.indexOf(',') == -1) {
        str = str.replace(' ', ',');
    }
    return parseFloatList(str, ',');
}

function parseTransform(elem)
{
    if (!elem._ks) {
        elem._ks = { };
    }
    if (elem._ks.transform) {
        return;
    }
    var trans = elem._ks.transform = [];
    for (var i = 0 ; i <= P_ANCHORY ; ++i) {
        trans[i] = 0;
    }
    trans[P_SCALEX] = 1;
    trans[P_SCALEY] = 1;
    // split transforms with ') ' because IE returns 'translate(x y)' while
    // other browsers return 'translate(x,y)'
    var transAttr = elem.getAttribute("transform");
    if (!transAttr) {
        return;
    }
    var parts = transAttr.trim().split(') ');
    // skips anchor translate and seeks to position translate to remove extra tranforms before it
    for (var j = parts.length-2; j >= 0; --j) {
        if (startsWith(parts[j], "translate(")) {
            for (var k = 0; k < j; k++) {
                parts.shift();
            }
            break;
        }
    }
    var first = parts.shift();
    var vals;
    if (startsWith(first, "translate(")) {
        vals = parseCommaSeparated(first.substring(10));
        trans[P_POSITIONX] = vals[0];
        trans[P_POSITIONY] = isSet(vals[1]) ? vals[1] : 0; // IE may have only one translate value
        first = parts.shift();
    }
    if (startsWith(first, "rotate(")) {
        vals = parseCommaSeparated(first.substring(7));
        trans[P_ROTATE] = vals[0];
        first = parts.shift();
    }
    if (startsWith(first, "skewX(")) {
        vals = parseCommaSeparated(first.substring(6));
        trans[P_SKEWX] = vals[0];
        first = parts.shift();
    }
    if (startsWith(first, "skewY(")) {
        vals = parseCommaSeparated(first.substring(6));
        trans[P_SKEWY] = vals[0];
        first = parts.shift();
    }
    if (startsWith(first, "scale(")) {
        vals = parseCommaSeparated(first.substring(6));
        trans[P_SCALEX] = vals[0];
        trans[P_SCALEY] = isSet(vals[1]) ? vals[1] : vals[0];
        first = parts.shift();
    }
    if (startsWith(first, "translate(")) {
        vals = parseCommaSeparated(first.substring(10));
        trans[P_ANCHORX] = vals[0];
        trans[P_ANCHORY] = isSet(vals[1]) ? vals[1] : 0;
    }
}

function composeAndSetTransformAttr(elem)
{
    parseTransform(elem);
    var trans = elem._ks.transform;
    var transform = "";

    var mpath = elem._ks['mpath'];
    if (mpath) {
        // use the interpolated distance to get point on motion path
        var dist = trans[P_MOTION_DISTANCE];
        if (dist < 0) { dist = 0; } // old SVG1.1 browsers don't clamp getPointAtLength(dist)
        if (dist > 100) { dist = 100; }
        dist = dist * mpath[MPATH_PATHLENGTH] / 100;
        var pt = mpath[MPATH_ELEMENT].getPointAtLength(dist);
        transform = "translate("+pt.x+","+pt.y+") ";

        // auto motion-rotate
        if (mpath[MPATH_AUTOROTATE]) {
            // get tangent of path by sampling another point just before or after
            var prevpt;
            if (dist < 0.5) { // tangent of start point 0 and point at 0.5
                prevpt = pt;
                pt = mpath[MPATH_ELEMENT].getPointAtLength(0.5);

            } else { // get point before dist
                prevpt = mpath[MPATH_ELEMENT].getPointAtLength(dist-0.5);
            }
            var deg = Math.atan2(pt.y - prevpt.y, pt.x - prevpt.x) * 180 / Math.PI;
            transform += "rotate("+deg+") ";
        }
    }
    for (var prop = P_POSITIONX; prop < trans.length; ++prop) {
        var val = trans[prop];
        var defaultVal = (prop == P_SCALEX || prop == P_SCALEY) ? 1 : 0;
        if (val != defaultVal) {
            transform += " "+transformNames[prop]+"(";
            if (prop <= P_POSITIONY) { // position x and y
                transform += (prop == P_POSITIONX) ? val+",0" : "0,"+val;
            } else if (prop >= P_ANCHORX) { // anchor x and y
                transform += (prop == P_ANCHORX) ? val+",0" : "0,"+val;
            } else if (prop >= P_SCALEX) { // scale x and y
                transform += (prop == P_SCALEX) ? val+",1" : "1,"+val;
            } else {
                transform += val; // skew x/y or rotate
            }
            transform += ")";
        }
    }
    setAttr(elem, "transform", transform);
}

/**
 * @constructor
 */
function KsAnimation(options)
{
    // optional options
    this._options = options;

    // animation data
    this._targets = [];
    this._data = [];

    // duration and end time of the timeline
    this._endTime = 0;

    // states are mapped to hold and start times:
    // idle: holdTime and startTime null
    // running: holdTime null, startTime set
    // paused: holdTime set, startTime null
    // finished: holdTime and startTime set, current time <= in or >= out time

    // start time
    this._startTimeVal = null;

    // hold time - time used when timeline isn't progressing (rate is zero, paused or finished)
    this._holdTime = null;

    this._previousCurrentTime = null;

    // range playback values
    this._rangeIn = 0;
    this._rangeOut = 0;

    // play loop count
    this._loopCount = 0;

    // playback rate, default value is 1, which is normal playback rate.
    // zero and negative values are allowed
    this._playRate = 1;

    // set to true when Timeline is scheduled to play - used to set startTime during first update
    this._hasPendingPlay = false;

    // set to true if base transform is already parsed and stored
    this._baseTransformStored = false;

    // set to true if this has been added to the global timeline list
    this._addedToList = false;
}

KsAnimation.prototype = {

    _updateFinishedState: function(didSeek)
    {
        var pendingCallback = PENDING_NONE;
        // check if finished
        if (this._startTimeVal !== null) {
            var curTime = this._getCurrentTime();

            // check if end is reached
            if (this._playRate > 0 && curTime !== null && curTime >= this._rangeOut) {
                if (this._loopCount) { // loop jumping to range in
                    this._startTimeVal = sysTimelineTime - (this._rangeIn / this._playRate);
                    this._loopCount--; // this doesn't decrement Infinity
                    pendingCallback = PENDING_ONLOOP;

                } else { // no looping
                    pendingCallback = PENDING_ONFINISH;
                    if (didSeek) {
                        this._holdTime = curTime;
                    } else {
                        if (this._previousCurrentTime) {
                            // _previousCurrentTime ensures that jumping to a time after _rangeOut
                            // during "running" will be possible without clamping the time
                            // to _rangeOut - the time is preserved and state becomes "finished"
                            this._holdTime = Math.max(this._previousCurrentTime, this._rangeOut);
                        } else {
                            this._holdTime = this._rangeOut;
                        }
                    }
                }

            // check if zero time is reached
            } else if (this._playRate < 0 && curTime !== null && curTime <= this._rangeIn) {
                if (this._loopCount && this._rangeOut != Infinity) { // loop jumping to range out
                    this._startTimeVal = sysTimelineTime - (this._rangeOut / this._playRate);
                    this._loopCount--; // this doesn't decrement Infinity
                    pendingCallback = PENDING_ONLOOP;

                } else { // no looping
                    this._loopCount = 0; // clear _loopCount for the rangeOut Infinity case
                    pendingCallback = PENDING_ONFINISH;
                    if (didSeek) {
                        this._holdTime = curTime;
                    } else {
                        if (this._previousCurrentTime) {
                            // _previousCurrentTime ensures that jumping to a time before _rangeIn
                            // during "running" will be possible without clamping the time
                            // to _rangeIn - the time is preserved and state becomes "finished"
                            this._holdTime = Math.min(this._previousCurrentTime, this._rangeIn);
                        } else {
                            this._holdTime = this._rangeIn;
                        }
                    }
                }

            // from "finished" state back to "running"
            } else if (curTime !== null && this._playRate != 0) {
                if (didSeek && this._holdTime !== null) {
                    // start time and hold time have values, which means we are in finished state,
                    // this happens if animation is finished and playback rate is reversed or
                    // time is set
                    this._startTimeVal = sysTimelineTime - (this._holdTime / this._playRate);
                }
                this._holdTime = null;
            }
        }
        this._previousCurrentTime = this._getCurrentTime();
        return pendingCallback;
    },

    _updateValues: function(mainUpdate)
    {
        if (mainUpdate) {
            if (this._hasPendingPlay) {
                this._hasPendingPlay = false;
                // set start time during the first animation tick so that no frames are skipped
                // in the beginning
                if (this._startTimeVal === null) {
                    if (this._playRate != 0 && this._holdTime !== null) {
                        this._startTimeVal = sysTimelineTime - this._holdTime / this._playRate;
                        this._holdTime = null;
                    } else {
                        this._startTimeVal = sysTimelineTime;
                    }
                }
            }

            // running animation, so check finished state (can't check getState() because
            // it may return finished for animation which doesn't have onfinish called)
            // the callbacks will be called later so that them calling remove() works
            if (this._holdTime === null && this._startTimeVal !== null) {
                var pendingcb = this._updateFinishedState(false);
                if (pendingcb != PENDING_NONE) {
                    pendingCallbacks.push([ this, pendingcb ]);
                }
            }
        }
        var curTime = this._getCurrentTime();

        // don't update values if animation is idle
        if (curTime === null) {
            return false;
        }

        var targets = this._targets;
        var adata = this._data;
        for (var e = 0; e < targets.length; ++e) {
            var target = targets[e];
            var hasTransform = false;
            for (var p = 0; p < adata[e].length; ++p) {
                var pdata = adata[e][p];
                var prop = pdata[INX_PROP];
                if (prop === null) {
                    continue;
                }

                var val;

                // interpolate value
                var starttime = pdata[INX_STARTTIME];
                var tlen = pdata[INX_TIMES].length;
                var dur = pdata[INX_TIMES][tlen-1] - starttime;

                if (dur == 0) { // zero duration
                    val = pdata[INX_VALUES][tlen-1];

                } else if (curTime <= starttime) { // before begin time
                    val = pdata[INX_VALUES][0];

                // after iteration has ended
                } else if (curTime >= starttime + pdata[INX_ITERATIONDUR]) {
                    if ((pdata[INX_ITERATIONDUR] % dur) == 0) {
                        // use optimized path, if the end time is a multiple of last keyframe time,
                        // this means that iteration stopped exactly at last keyframe
                        val = pdata[INX_VALUES][tlen-1];
                    } else {
                        // calculate iteration end value, needs to interpolate because it is not at
                        // a keyframe
                        val = animateProperty(pdata[INX_ITERATIONDUR] % dur, pdata);
                    }

                } else { // during active time
                    // calculate simple time
                    var simpleTime = ((curTime-starttime) % dur);
                    val = animateProperty(simpleTime, pdata);
                }

                if (prop == P_MOTION_DISTANCE) {
                    // store motion path values
                    target._ks['mpath'] = pdata[INX_MPATH];
                    target._ks.transform[prop] = val;
                    hasTransform = true;

                } else if (prop <= P_ANCHORY) {
                    // store transform value
                    target._ks.transform[prop] = val;
                    hasTransform = true;

                } else { // set other properties
                    var svgval = convertToSvgValue(propertyType(pdata[INX_FLAGS]), val);
                    if (pdata[INX_FLAGS] & FLAG_TARGET_ATTRIBUTE) {
                        setAttr(target, prop, svgval);
                    } else {
                        target.style[prop] = svgval;
                    }
                }
            }
            // if transform was animated, then set it
            if (hasTransform) {
                composeAndSetTransformAttr(target);
            }
        }
        // return flag indicating if this animation wants to keep ticking
        return this._getState() == STATE_RUNNING;
    },

    _performAutoRemove: function()
    {
        if (this._options['autoremove'] !== false && this._getState() == STATE_FINISHED) {
            remove(this);
        }
    },

    _saveBaseTransform: function()
    {
        if (this._baseTransformStored) {
            return;
        }
        this._baseTransformStored = true;
        var atargets = this._targets;
        var adata = this._data;
        for (var e = 0; e < atargets.length; ++e) {
            var target = atargets[e];
            var compVals = false;
            for (var p = 0; p < adata[e].length; ++p) {
                var pdata = adata[e][p];
                var prop = pdata[INX_PROP];
                // including motion path (distance)
                if (prop <= P_ANCHORY) {
                    parseTransform(target);
                }
            }
        }
    },

    _parseTime(value)
    {
        if (typeof value == 'number') {
            return value;
        }
        if (!isSet(this._options['markers']) || !isSet(this._options['markers'][value])) {
            throw ERR("Invalid marker: "+value);
        }
        return +(this._options['markers'][value]);
    },

    // starts playing the timeline
    'play': function(millisecs)
    {
        if (isSet(millisecs) && millisecs !== null) {
            millisecs = this._parseTime(millisecs);
            checkIsFinite(millisecs);
            // don't allow before or after range, because that would go directly to finished state
            if (this._playRate < 0 && millisecs < this._rangeIn) { millisecs = this._rangeIn; }
            if (this._playRate > 0 && millisecs > this._rangeOut) { millisecs = this._rangeOut; }
            this._setCurrentTime(millisecs, true);
        }
        if (!this._addedToList) {
            throw NOT_IN_LIST_EXCEPTION;
        }
        var t = this._getCurrentTime();
        if (this._playRate > 0 && (t === null || t >= this._rangeOut)) {
            this._holdTime = this._rangeIn;
        } else if (this._playRate < 0 && (t === null || t <= this._rangeIn)) {
            if (this._rangeOut == Infinity) {
                throw ERR("Cannot seek to Infinity");
            }
            this._holdTime = this._rangeOut;
        } else if (this._playRate == 0 && t === null) {
            this._holdTime = this._rangeIn;
        }
        // break out if the timeline is already playing
        if (this._holdTime === null) {
            return this;
        }
        // schedule start, so that start time is accurately calculated in animation mainloop
        this._startTimeVal = null;
        this._hasPendingPlay = true;
        this._saveBaseTransform();
        startTicking();
        return this;
    },

    // pauses the timeline
    'pause': function(millisecs)
    {
        if (!this._addedToList) {
            throw NOT_IN_LIST_EXCEPTION;
        }
        if (isSet(millisecs)) {
            millisecs = this._parseTime(millisecs);
            checkIsFinite(millisecs);
        }
        if (this._getState() != STATE_PAUSED) {
            updateSysTimelineTime();
            var curTime = this._getCurrentTime();
            if (curTime === null) {
                if (this._playRate >= 0) {
                    this._holdTime = this._rangeIn;
                } else {
                    if (this._rangeOut == Infinity) {
                        throw ERR("Cannot seek to Infinity");
                    }
                    this._holdTime = this._rangeOut;
                }
            }
            if (this._startTimeVal !== null && this._holdTime === null) {
                this._holdTime = curTime;
            }
            this._startTimeVal = null;
            this._hasPendingPlay = false;
            this._updateFinishedState(false);
            this._saveBaseTransform();
            startTicking();
        }
        if (isSet(millisecs)) {
            this._setCurrentTime(millisecs, true);
        }
        return this;
    },

    'range': function(inTime, outTime)
    {
        if (arguments.length == 0) {
            return { "in": this._rangeIn, "out": this._rangeOut };
        }
        var pin = this._parseTime(inTime);
        var pout = this._endTime;
        if (isSet(outTime)) {
            pout = this._parseTime(outTime);
        }
        checkIsFinite(pin);
        if (pin < 0 || pout < 0 || pin >= pout || isNaN(pout)) {
            throw ERR("Invalid range");
        }
        var oldState = this._getState();
        this._rangeIn = pin;
        this._rangeOut = pout;
        // update state to play if it was finished and range changed it to running
        if (oldState == STATE_FINISHED && this._getState() == STATE_RUNNING) {
            this['play']();
        }
        return this;
    },

    'loop': function(loopCount)
    {
        if (!isSet(loopCount)) {
            return { "count": this._loopCount };
        }
        this._loopCount = loopCount === true ? Infinity : Math.floor(loopCount);
        if (this._loopCount < 0 || isNaN(this._loopCount)) { this._loopCount = 0; }
        return this;
    },

    _getCurrentTime: function()
    {
        if (this._holdTime !== null) {
            return this._holdTime;
        }
        if (this._startTimeVal === null) {
            return null;
        }
        return (sysTimelineTime - this._startTimeVal) * this._playRate;
    },

    // sets the time to the given millisecs
    _setCurrentTime: function(seekTime, updateTime)
    {
        // update timeline time before checking seekTime is null
        if (updateTime) {
            updateSysTimelineTime();
        }
        if (seekTime === null) {
            return;
        }

        this._saveBaseTransform();
        if (this._holdTime !== null || this._startTimeVal === null || this._playRate == 0) {
            this._holdTime = seekTime;
            updateAllAnimations(false);
        }  else {
            this._startTimeVal = sysTimelineTime - (seekTime / this._playRate);
        }
        if (!this._addedToList) {
            this._startTimeVal = null;
        }
        this._previousCurrentTime = null;
        this._updateFinishedState(true);
        startTicking();
    },

    // gets the time
    _getTime: function()
    {
        return this._getCurrentTime();
    },

    'time': function(millisecs) {
        if (isSet(millisecs)) {
            if (!this._addedToList) {
                throw NOT_IN_LIST_EXCEPTION;
            }
            millisecs = this._parseTime(millisecs);
            checkIsFinite(millisecs);
            this._setCurrentTime(millisecs, true);
            return this;
        }
        return this._getTime();
    },


    _getState: function()
    {
        var curTime = this._getCurrentTime();
        if (this._hasPendingPlay) { // additional condition, there is no "pending" state
            return STATE_RUNNING;
        }
        if (curTime === null) {
            return STATE_IDLE;
        }
        if (this._startTimeVal === null) {
            return STATE_PAUSED;
        }
        if ((this._playRate > 0 && curTime >= this._rangeOut) ||
                (this._playRate < 0 && curTime <= this._rangeIn)) {
            return STATE_FINISHED;
        }
        return STATE_RUNNING;
    },

    // returns play state
    'state': function() {
        return this._getState();
    },

    // returns the duration of the animation or Infinity if it runs forever
    'duration': function()
    {
        return this._endTime;
    },

    // gets the playback rate, 1=normal, zero stops the progress, negative values reverse
    // the playback
    _getRate: function()
    {
        return this._playRate;
    },

    // sets the playback rate, 1=normal, zero stops the progress, negative values reverse
    // the playback
    _setRate: function(value)
    {
        checkIsFinite(value);
        updateSysTimelineTime();
        var oldTime = this._getCurrentTime();
        this._playRate = value;
        if (oldTime !== null) {
            this._setCurrentTime(oldTime, false);
        }
    },

    'rate': function(r) {
        if (isSet(r)) {
            this._setRate(r);
            return this;
        }
        return this._getRate();
    },

    'marker': function(name) {
        return isSet(this._options['markers']) ? this._options['markers'][name] : undefined;
    },

    '_cancel': function() {
        if (!this._addedToList || this._getState() == STATE_IDLE) {
            return this;
        }
        this._holdTime = null;
        this._startTimeVal = null;
        this._hasPendingPlay = false;
        return this;
    }
}

function getShortOrLong(kf, name1, name2)
{
    var value = kf[name1];
    if (value === undefined) {
        value = kf[name2];
    }
    return value;
}

function fillEasing(easing, len)
{
    if (!easing) {
        easing = [];
    }
    while (easing.length < len) {
        easing.push([ TIMING_FN_CUBIC, 0, 0, 0.58, 1 ]); // default: ease-out
    }
    return easing;
}

function parseInt10(value)
{
    return parseInt(value, 10);
}

function parseTimingFn(val)
{
    if (Array.isArray(val)) { // array means a shorthand timing function
        return val;
    }
    if (startsWith(val, "cubic-bezier(")) {
        var vals = val.substring(13, val.length-1).split(',');
        return [ TIMING_FN_CUBIC,
               parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]), parseFloat(vals[3]) ];

    } else if (startsWith(val, "steps(")) {
        var svals = val.substring(6, val.length-1).split(',');
        return [ svals[1] && svals[1].trim() == "start" ? TIMING_FN_STEP_START : TIMING_FN_STEP_END,
                 parseFloat(svals[0]) ];
    }
    // other are linear
    return [ TIMING_FN_LINEAR ];
}

function parseColor(cstr)
{
    cstr = cstr.trim();
    if (startsWith(cstr, "#")) {
        return (parseInt(cstr.substring(1), 16) << 8) + 255;
    }
    if (startsWith(cstr, "rgba(")) {
        cstr = cstr.substring(5, cstr.length-1);
        var p = cstr.split(',');
        return (parseInt10(p[0]) << 24) + (parseInt10(p[1]) << 16) + (parseInt10(p[2]) << 8) +
                (parseFloat(p[3])*255) << 0; // shift alpha by 0 to convert it to int
    }
    return cstr;
}

function parseFilter(filter)
{
    if (filter == "none") {
        return [ FILTER_NONE ];
    }
    var res = [];
    var fninx = filter.indexOf('(');
    while (fninx > 0) {
        var inx = filterNames.indexOf(filter.substring(0, fninx));
        if (inx >= 0) {
            res.push(inx);
            var endinx = filter.indexOf(') ');
            if (endinx < 0) endinx = filter.length-1;
            var params = filter.substring(fninx+1, endinx).split(' ');
            if (inx == FILTER_DROPSHADOW) { // 3 numbers and a color
                res.push(parseFloat(params[0]));
                res.push(parseFloat(params[1]));
                res.push(parseFloat(params[2]));
                res.push(parseColor(params[3]));

            } else if (inx == FILTER_URL) { // string parameter
                res.push(params[0]);

            } else { // numeric parameter
                res.push(parseFloat(params[0]));
            }
            filter = filter.substring(endinx+1).trim();
            // get next filter
            fninx = filter.indexOf('(');
        } else {
            break;
        }
    }
    return res;
}

/**
 * @return {Element} DOM element
 */
function solveTarget(t)
{
    var e = (t instanceof Element) ? t : document.getElementById(t.substring(1));
    if (!e) { throw ERR("Invalid target: "+t); }
    return e;
}

function parseValues(prop, values)
{
    var type = propertyType(propertyFlags(prop));
    for (var i = 0; i < values.length; ++i) {
        if (type == FLAG_TYPE_PATH) {
            // split values for fast interpolation
            var val = values[i].substring(6, values[i].length-2); // remove "path('')"
            var commands = val.match(/[A-DF-Za-df-z][-+0-9eE., ]*/ig);
            var s = [];
            for (var k = 0; k < commands.length; ++k) {
                s.push(commands[k][0]);
                var coords = commands[k].trim().length > 1 ?
                            commands[k].substring(1).split(',') : [];
                for (var ci = 0; ci < coords.length; ++ci) {
                    coords[ci] = parseFloat(coords[ci]);
                }
                s.push(coords);
            }
            values[i] = s;

        } else if (type == FLAG_TYPE_COLOR) {
            if (startsWith(values[i], "#")) {
                var hasAlpha = (values[i].length == 9);
                values[i] = parseInt(values[i].substring(1), 16);
                if (!hasAlpha) { // add alpha to colors without it
                    values[i] = (values[i]*256) | 255;
                }
            } else if (!startsWith(values[i], "url(") && values[i] != "none") {
                console.warn("unsupported color: "+values[i]);
                values[i] = 0;
            }
        } else if (type == FLAG_TYPE_FILTER) {
            values[i] = parseFilter(values[i]);

        } else if (type == FLAG_TYPE_LENGTH_LIST) {
            if (values[i] != "none") {
                if (!/^[0-9 .]*$/.test(values[i])) { // units are not allowed
                    console.warn("unsupported value: "+values[i]);
                    values[i] = [ 0 ];
                } else {
                    values[i] = parseFloatList(values[i], ' ');
                }
            } else {
                values[i] = [ 0 ];
            }

        } else if (type == FLAG_TYPE_LENGTH) {
            checkIsFinite(values[i]);
            values[i] = parseFloat(values[i]);

        } else if (prop === P_MOTION_DISTANCE) {
            // ignores possible trailing percentage
            values[i] = parseFloat(values[i]);
        }
    }
}

function validateTimes(times)
{
    if (!isFinite(times[0]) || times[0] < 0) {
        throw ERR("Invalid time: "+times[0]);
    }
    for (var i = 1; i < times.length; ++i) {
        if (!isFinite(times[i]) || times[i] < 0 || times[i] < times[i-1]) {
            throw ERR("Invalid time: "+times[i]);
        }
    }
}

function initTimeline(tl, tlData)
{
    var totalEnd = 0;
    for (var ai = 0; ai < tlData.length-1; ai += 2) {
        var te = solveTarget(tlData[ai]);
        var anim = tlData[ai+1];
        if (!te._ks) {
            te._ks = { };
        }
        var newadata = [];
        for (var i = 0; i < anim.length; ++i) {
            var kf = anim[i];
            var prop = getShortOrLong(kf, "p", "property");
            if (!isValidProperty(prop)) {
                throw ERR("Invalid property: "+prop);
            }
            var propIndex = transformProps.indexOf(prop); // convert transform strings to numbers
            if (prop !== "" && propIndex >= 0) {
                prop = propIndex;
            }
            var flags = propertyFlags(prop);

            var times = getShortOrLong(kf, "t", "times");
            if (!times || times.length < 2) {
                throw ERR("Not enough times");
            }
            times = copyArray(times);
            validateTimes(times);
            var starttime = times[0];
            var endtime = times[times.length-1];
            var rdur = endtime - starttime;
            var iters = kf["iterations"] || 0;
            if (iters < 1) {
                iters = 1;
            }
            rdur = rdur * iters;
            if (totalEnd < rdur + starttime) {
                totalEnd = rdur + starttime;
            }

            var values = getShortOrLong(kf, "v", "values");
            if (!values || values.length != times.length) {
                throw ERR("Values do not match times");
            }
            values = copyArray(values);
            parseValues(prop, values);

            var easing = getShortOrLong(kf, "e", "easing");
            easing = fillEasing(easing, times.length);
            for (var ei = 0; ei < easing.length; ++ei) {
                easing[ei] = parseTimingFn(easing[ei]);
            }
            var nprop = [ prop, flags, starttime, rdur, times, values, easing, iters ];

            var motionPath = getShortOrLong(kf, "mp", "motionPath");
            if (isSet(motionPath) && prop === P_MOTION_DISTANCE) {
                nprop[INX_MPATH] = [];
                // store auto rotate flag
                nprop[INX_MPATH][MPATH_AUTOROTATE] = kf["motionRotate"];
                // create and store a path element so it can be sampled in animation mainloop
                var mpathElement = document.createElementNS("http://www.w3.org/2000/svg", 'path');
                if (!motionPath) {
                    motionPath = "M0,0";
                }
                mpathElement.setAttribute("d", motionPath);
                nprop[INX_MPATH][MPATH_ELEMENT] = mpathElement;
                // store total length for faster access
                nprop[INX_MPATH][MPATH_PATHLENGTH] = mpathElement.getTotalLength();
            }
            newadata.push(nprop);
        }
        if (newadata.length > 0) {
            tl._targets.push(te);
            tl._data.push(newadata);
        }
    }
    tl._endTime = totalEnd;
    tl._rangeIn = 0;
    tl._rangeOut = tl._endTime;
}

function animate()
{
    var options = {};
    if (arguments.length % 2 == 1) { // odd count of arguments means that options are given
        options = copyMap(arguments[arguments.length-1]);
    }

    var tl = new KsAnimation(options);
    initTimeline(tl, arguments);
    add(tl);
    return tl;
}

function add(timeline)
{
    if (timeline._addedToList === false) {
        globalTimelineList.push(timeline);
        timeline._addedToList = true;
        if (timeline._options['autoplay'] !== false) {
            timeline.play();
        }
    }
    return this;
}

function remove(timeline) {
    if (timeline._addedToList === true) {
        timeline["_cancel"]();
        removeItemFromArray(globalTimelineList, timeline);
        // removed timeline won't have any pending callbacks called
        removeItemFromArray(pendingCallbacks, timeline);
        timeline._addedToList = false;
    }
    return this;
}

function removeAll()
{
    for (var i = globalTimelineList.length-1; i >= 0; --i) {
        remove(globalTimelineList[i]);
    }
    return this;
}

function timelines()
{
    return copyArray(globalTimelineList);
}

function globalPlay()
{
    if (holdTimelineTime) {
        sysTimelineTimeDrift = holdTimelineTime - new Date().getTime();
        holdTimelineTime = undefined;
        startTicking();
    }
    return this;
}

function globalPause()
{
    if (!holdTimelineTime) {
        holdTimelineTime = sysTimelineTime;
        updateAllAnimations(false);
    }
    return this;
}

function globalState()
{
    return holdTimelineTime ? STATE_PAUSED : STATE_RUNNING;
}

return {
    'version': '1.0.1',
    'animate': animate,
    'add': add,
    'remove': remove,
    'removeAll': removeAll,
    'timelines': timelines,
    'globalPlay': globalPlay,
    'globalPause': globalPause,
    'globalState': globalState
};
})();

