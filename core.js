'use strict';

require('setimmediate');

var cb = require('./buffers');


var unresolved = exports.unresolved = { state: "park" };

var rejected = exports.rejected = function(err) {
  return { state: "error", value: err };
};

var resolved = exports.resolved = function(val) {
  return { state: "continue", value: val };
};

var isResolved = exports.isResolved = function(res) {
  return res.state == 'continue';
};


var go_ = function(machine, step) {
  while(!step.done) {
    var res = step.value();

    switch (res.state) {
    case "error":
      machine.throw(res.value);
    case "park":
      setImmediate(function() { go_(machine, step); });
      return;
    case "continue":
      step = machine.next(res.value);
      break;
    case "pass":
      setTimeout(function() { go_(machine, machine.next()); }, res.value);
      return;
    }
  }
};

exports.go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
};


exports.pass = function(milliseconds) {
  return function() {
    return { state: "pass", value: milliseconds || 0 };
  };
};


exports.chan = function(arg) {
  var buffer;

  if (arg == undefined)
    buffer = new cb.Unbuffer();
  else if (typeof arg == "object")
    buffer = arg
  else if (arg === 0)
    buffer = cb.nullBuffer;
  else
    buffer = new cb.Buffer(arg || 1);

  return {
    buffer: buffer,
    isClosed: false
  };
};

var push = exports.push = function(ch, val) {
  return function() {
    if (val === undefined)
      return rejected(new Error("push() requires an argument"));
    else if (ch.isClosed)
      return resolved(false);
    else if(ch.buffer.tryToPush(val))
      return resolved(true);
    else
      return unresolved;
  };
};

exports.pushImmediate = function(ch, val) {
  if (val === undefined)
    throw new Error("forced push requires an argument");
  else if (ch.isClosed)
    throw new Error("forced push to closed channel");
  else if (!ch.buffer.tryToPush(val))
    throw new Error("forced push failed");
};

var pull = exports.pull = function(ch) {
  return function() {
    var res = ch.buffer.tryToPull();
    if (res.length > 0)
      return resolved(res[0]);
    else if (ch.isClosed)
      return resolved();
    else
      return unresolved;
  };
};

exports.pullImmediate = function(ch) {
  var res = ch.buffer.tryToPull();
  if (res.length > 0)
    return res[0];
  else
    throw new Error("forced pull failed");
};

exports.close = function(ch) {
  ch.isClosed = true;
};


exports.select = function(ops, default_value) {
  return function() {
    for (var i = 0; i < ops.length; ++i) {
      var op = ops[i];
      var res = (Array.isArray(op)) ? push(op[0], op[1])() : pull(op)();
      if (isResolved(res))
        return resolved({ index: i, value: res.value });
    }
    if (default_value === undefined)
      return unresolved;
    else
      return resolved(default_value);
  }
};


exports.unwrap = function(ch) {
  return function() {
    var res = pull(ch)();
    return isResolved(res) ? res.value : res;
  };
};
