'use strict';

require('setimmediate');

var RingBuffer = require('./RingBuffer');

var schedule = function() {
  var queue = new RingBuffer(100);
  var scheduleFlush = true;

  var flush = function() {
    scheduleFlush = true;
    for (var i = queue.count(); i > 0; --i)
      next.apply(null, queue.read());
  };

  return function(machine, state, value) {
    if (queue.isFull())
      queue.resize(Math.floor(queue.capacity() * 1.5));
    queue.write([machine, state, value]);
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
  this.client = null;
  this.state  = UNRESOLVED;
  this.value  = undefined;
};

Action.prototype.publish = function(machine) {
  schedule(machine, this.state, this.value);
};

Action.prototype.subscribe = function(machine) {
  if (this.state != UNRESOLVED)
    this.publish(machine);
  else if (this.client != null)
    machine['throw'](new Error('actions can only have one client'));
  else
    this.client = machine;
}

Action.prototype.update = function(state, val) {
  if (this.state != UNRESOLVED)
    throw new Error("action is already resolved");

  this.state = state;
  this.value = val;

  if (this.client != null)
    this.publish(this.client);
};

Action.prototype.resolve = function(val) {
  this.update(RESOLVED, val);
};

Action.prototype.reject = function(cause) {
  this.update(REJECTED, cause);
};


var next = function(machine, state, value) {
  var step;

  if (state == UNRESOLVED)
    step = machine.next();
  else if (state == RESOLVED)
    step = machine.next(value);
  else
    step = machine['throw'](value);

  if (!step.done) {
    if (!!(step.value) && step.value.constructor == Action)
      step.value.subscribe(machine);
    else
      schedule(machine, RESOLVED, step.value);
  }
};


var go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var m = machine.apply(undefined, args);
  schedule(m, UNRESOLVED);
  return m;
};


module.exports = {
  Action: Action,
  go    : go
};
