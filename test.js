import assert from 'assert';

// global objects to mock browser globals
global.window = {
    getComputedStyle: function() { return {}; }
};
global.document = {};
global.navigator = {};

// dynamic import so that global variables are seen by the module
const kjs = await import('./dist/keyshapejs.es.js');

// check properties are defined
assert.strictEqual(Object.keys(kjs).length, 9);
assert.ok(kjs.animate);
assert.ok(kjs.add);
assert.ok(kjs.remove);
assert.ok(kjs.removeAll);
assert.ok(kjs.timelines);
assert.ok(kjs.globalPlay);
assert.ok(kjs.globalPause);
assert.ok(kjs.globalState);
assert.ok(kjs.version.startsWith("1."));

console.log('Tests passed.');
