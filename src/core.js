'use strict';

var enqueue = require('./scheduler')();
var defer   = require('./defer').defer;


exports.go = function(generator) {
  var args    = Array.prototype.slice.call(arguments, 1);
  var gen     = generator.apply(undefined, args);
  var result  = defer();
  var succeed = function(val) { enqueue(function() { use(gen.next(val)); }); };
  var fail    = function(val) { enqueue(function() { use(gen.throw(val)); }); };

  var use = function(step) {
    var val = step.value;

    if (step.done)
      result.resolve(val);
    else if (val != null && typeof val.then == 'function')
      val.then(succeed, fail);
    else
      succeed(val);
  };

  succeed();
  return result;
};
