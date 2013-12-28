'use strict';

var enqueue = require('./scheduler')();
var deferred = require('./deferred').deferred;


var runNext = function(task, step) {
  var result = step.value;

  if (step.done)
    task.result.resolve(result);
  else if (result != null && typeof result.then == 'function')
    result.then(task.succeed, task.fail);
  else
    task.succeed(result);
};


exports.go = function(generator) {
  var args = Array.prototype.slice.call(arguments, 1);
  var gen = generator.apply(undefined, args);
  var task = {
    result: deferred()
  };
  task.succeed = function(val) {
    enqueue(function() { runNext(task, gen.next(val)); });
  };
  task.fail = function(cause) {
    enqueue(function() { runNext(task, gen['throw'](cause)) });
  };
  task.succeed();
  return task.result;
};
