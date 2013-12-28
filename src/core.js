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
  this.update(RESOLVED, val);
};

Deferred.prototype.reject = function(cause) {
  this.update(REJECTED, cause);
};

Deferred.prototype.publish = function() {
  if (this.isResolved() && this.client)
    scheduleNext(this.client, this.state, this.value);
};

Deferred.prototype.subscribe = function(machine) {
  if (this.client != null)
    machine['throw'](new Error('a deferred can only have one client'));
  else {
    this.client = machine;
    this.publish();
  }
}

Deferred.prototype.update = function(state, val) {
  if (this.isResolved())
    throw new Error("deferred is already resolved");

  this.state = state;
  this.value = val;
  this.publish();
};


var scheduleNext = function(machine, state, val) {
  enqueue(function() { next(machine, state, val); });
};

var next = function(machine, state, val) {
  var step = (state == REJECTED) ? machine['throw'](val) : machine.next(val);
  var result;

  if (!step.done) {
    result = step.value;
    if (result == null)
      scheduleNext(machine, RESOLVED, result);
    else if (result.constructor == Deferred)
      result.subscribe(machine);
    else if (typeof result.then == 'function')
      result.then(function(value) {
        scheduleNext(machine, RESOLVED, value);
      }, function(reason) {
        scheduleNext(machine, REJECTED, reason);
      });
    else
      scheduleNext(machine, RESOLVED, result);
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
