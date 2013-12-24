'use strict';

var enqueue = require('./scheduler')();

const PENDING  = 0;
const RESOLVED = 1;
const REJECTED = 2;


function Deferred() {
  this.client = null;
  this.state  = PENDING;
  this.value  = undefined;
};

Deferred.prototype.isResolved = function() {
  return this.state != PENDING;
};

Deferred.prototype.resolve = function(val) {
  update(this, RESOLVED, val);
};

Deferred.prototype.reject = function(cause) {
  update(this, REJECTED, cause);
};


var scheduleNext = function(machine, state, val) {
  enqueue(function() { next(machine, state, val); });
};

var subscribe = function(machine, deferred) {
  if (deferred.client != null)
    machine['throw'](new Error('a deferred can only have one client'));

  if (deferred.isResolved())
    scheduleNext(machine, deferred.state, deferred.value);
  else
    deferred.client = machine;
}

var update = function(deferred, state, val) {
  if (deferred.isResolved())
    throw new Error("deferred is already resolved");

  deferred.state = state;
  deferred.value = val;

  if (deferred.client != null)
    scheduleNext(deferred.client, state, val);
};

var next = function(machine, state, val) {
  var step = (state == REJECTED) ? machine['throw'](val) : machine.next(val);

  if (!step.done) {
    if (step.value != null && step.value.constructor == Deferred)
      subscribe(machine, step.value);
    else
      scheduleNext(machine, RESOLVED, step.value);
  }
};


exports.deferred = function() {
  return new Deferred();
};

exports.go = function(generator) {
  var args = Array.prototype.slice.call(arguments, 1);
  var machine = generator.apply(undefined, args);
  scheduleNext(machine);
  return machine;
};
