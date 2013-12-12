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

    switch (res.state) {
    case "error":
      machine.throw(res.value);
    case "park":
      schedule(machine, step);
      return;
    case "continue":
      step = machine.next(res.value);
      break;
    }
  }
};


exports.unresolved = { state: "park" };

exports.rejected   = function(err) { return { state: "error", value: err }; };

exports.resolved   = function(val) { return { state: "continue", value: val }; };

exports.isResolved = function(res) { return res.state == 'continue'; };

exports.go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
};
