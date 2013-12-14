'use strict';

require('setimmediate');

var RingBuffer = require('./RingBuffer');


var schedule = function() {
  var queue = new RingBuffer(100);
  var scheduleFlush = true;

  var flush = function() {
    scheduleFlush = true;
    var n = queue.count() / 2;
    for (var i = 0; i < n; ++i) {
      var m = queue.read();
      var s = queue.read();
      go_(m, s);
    }
  };

  return function(machine, step) {
    if (queue.isFull()) {
      var n = Math.floor(queue.capacity() * 1.5);
      queue.resize(n + n % 2); // resize to the next even length
    }
    queue.write(machine);
    queue.write(step);
    if (scheduleFlush) {
      setImmediate(flush);
      scheduleFlush = false;
    }
  };
}();


var go_ = function(machine, step) {
  while(!step.done) {
    var res = step.value();

    switch (res[0]) {
    case 'error':
      machine.throw(res[1]);
    case 'park':
      schedule(machine, step);
      return;
    case 'continue':
      step = machine.next(res[1]);
      break;
    }
  }
};


exports.unresolved = [ 'park' ];

exports.rejected   = function(err) { return [ 'error', err ]; };

exports.resolved   = function(val) { return [ 'continue', val ]; };

exports.isResolved = function(res) { return res[0] === 'continue'; };

exports.getValue   = function(res) {
  if (exports.isResolved(res))
    return res[1];
};

exports.go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
};
