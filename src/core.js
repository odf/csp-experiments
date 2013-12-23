'use strict';

require('setimmediate');

var RingBuffer = require('./RingBuffer');


const UNRESOLVED = 0;
const RESOLVED   = 1;
const REJECTED   = 2;


function Deferred() {
  this.client = null;
  this.state  = UNRESOLVED;
  this.value  = undefined;
};

var subscribe = function(machine, deferred) {
  if (deferred.client != null)
    machine['throw'](new Error('a deferred can only have one client'));
  else if (deferred.isResolved())
    schedule(machine, deferred.state, deferred.value);
  else
    deferred.client = machine;
}

var update = function(deferred, state, val) {
  if (deferred.isResolved())
    throw new Error("deferred is already resolved");

  deferred.state = state;
  deferred.value = val;

  if (deferred.client != null)
    schedule(deferred.client, deferred.state, deferred.value);
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
    if (!!(step.value) && step.value.constructor == Deferred)
      subscribe(machine, step.value);
    else
      schedule(machine, RESOLVED, step.value);
  }
};


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


Deferred.prototype.isResolved = function() {
  return this.state != UNRESOLVED;
};

Deferred.prototype.resolve = function(val) {
  update(this, RESOLVED, val);
};
 
Deferred.prototype.reject = function(cause) {
  update(this, REJECTED, cause);
};

exports.deferred = function() {
  return new Deferred();
};


exports.go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var m = machine.apply(undefined, args);
  schedule(m, UNRESOLVED);
  return m;
};
