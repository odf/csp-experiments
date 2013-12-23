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
      var d = queue.read();
      next(m, d);
    }
  };

  return function(machine, data) {
    if (queue.isFull()) {
      var n = Math.floor(queue.capacity() * 1.5);
      queue.resize(n + n % 2); // resize to the next even length
    }
    queue.write(machine);
    queue.write(data);
    if (scheduleFlush) {
      setImmediate(flush);
      scheduleFlush = false;
    }
  };
}();


const UNRESOLVED = 0;
const RESOLVED   = 1;
const REJECTED   = 2;
const IDLE       = 3;


function Action() {
  this.subscribers = [];
  this.state = UNRESOLVED;
  this.value = undefined;
};

Action.prototype.publish = function(subscriber) {
  schedule(subscriber, [this.state, this.value]);
};

Action.prototype.subscribe = function(machine) {
  if (this.state != UNRESOLVED)
    this.publish(machine);
  else
    this.subscribers.push(machine);
}

Action.prototype.unsubscribe = function(machine) {
  var i = this.subscribers.indexOf(machine);
  if (i >= 0)
    this.subscribers.splice(i, 1);
};

Action.prototype.update = function(state, val) {
  if (this.state != UNRESOLVED)
    throw new Error("action is already resolved");

  this.state = state;
  this.value = val;

  if (this.subscribers.length > 0)
    this.publish(this.subscribers.shift());
};

Action.prototype.resolve = function(val) {
  this.update(RESOLVED, val);
};

Action.prototype.reject = function(cause) {
  this.update(REJECTED, cause);
};


var next = function(machine, data) {
  var step;

  if (data === undefined)
    step = machine.next();
  else if (data[0] == RESOLVED)
    step = machine.next(data[1]);
  else
    step = machine['throw'](data[1]);

  if (!step.done)
    step.value.subscribe(machine);
};


var go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var m = machine.apply(undefined, args);
  schedule(m);
  return m;
};


module.exports = {
  Action: Action,
  go    : go
};
