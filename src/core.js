'use strict';

var makeScheduler = require('./scheduler');

const UNRESOLVED = 0;
const RESOLVED   = 1;
const REJECTED   = 2;


function Deferred() {
  this.client = null;
  this.state  = UNRESOLVED;
  this.value  = undefined;
};

Deferred.prototype.isResolved = function() {
  return this.state != UNRESOLVED;
};

Deferred.prototype.resolve = function(val) {
  update(this, RESOLVED, val);
};

Deferred.prototype.reject = function(cause) {
  update(this, REJECTED, cause);
};


var scheduleNext = (function() {
  var enqueue = makeScheduler();

  return function(machine, state, value) {
    enqueue(function() {
      next(machine, state, value);
    });
  };
})();


var subscribe = function(machine, deferred) {
  if (deferred.client != null)
    machine['throw'](new Error('a deferred can only have one client'));
  else if (deferred.isResolved())
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
    scheduleNext(deferred.client, deferred.state, deferred.value);
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
  scheduleNext(machine, UNRESOLVED);
  return machine;
};
