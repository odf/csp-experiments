'use strict';

var enqueue = require('./scheduler')();
var deferred = require('./deferred').deferred;


const RESOLVED = 1;
const REJECTED = 2;

var Deferred = deferred().constructor


var scheduleNext = function(machine, state, val) {
  enqueue(function() { runNext(machine, state, val); });
};

var runNext = function(machine, state, val) {
  var step;
  var result;

  if (state == REJECTED)
    step = machine.generator['throw'](val);
  else
    step = machine.generator.next(val);

  if (step.done)
    machine.result.resolve(step.value);
  else {
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


exports.go = function(generator) {
  var args = Array.prototype.slice.call(arguments, 1);
  var machine = {
    generator: generator.apply(undefined, args),
    result   : deferred(),
    resolve  : function(val) { scheduleNext(this, RESOLVED, val); },
    reject   : function(cause) { scheduleNext(this, REJECTED, cause); }
  };
  scheduleNext(machine);
  return machine.result;
};
