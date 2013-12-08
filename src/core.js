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


var queue = new cb.RingBuffer(100);
var scheduleFlush = true;

var flush = function() {
  scheduleFlush = true;
  var n = queue.count() / 2;
  for (var i = 0; i < n; ++i) {
    var m = queue.read();
    var s = queue.read();
    go_(m, s);
  }
};

var enqueue = function(machine, step) {
  if (queue.isFull()) {
    var n = Math.floor(queue.capacity() * 1.5);
    queue.resize(n + n % 2); // resize to the next even length
  }
  queue.write(machine);
  queue.write(step);
  if (scheduleFlush) {
    setImmediate(flush);
    scheduleFlush = false;
  }
};


var go_ = function(machine, step) {
  while(!step.done) {
    var res = step.value();

    switch (res.state) {
    case "error":
      machine.throw(res.value);
    case "park":
      enqueue(machine, step);
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

var go = exports.go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
};


exports.pass = function(milliseconds) {
  return function() {
    return { state: "pass", value: milliseconds || 0 };
  };
};


var chan = exports.chan = function(arg) {
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
    push    : buffer.push.bind(buffer),
    pull    : buffer.pull.bind(buffer),
    canBlock: buffer.canBlock.bind(buffer),
    isClosed: false
  };
};

var push = exports.push = function(ch, val) {
  return function() {
    if (val === undefined)
      return rejected(new Error("push() requires an argument"));
    else if (ch.isClosed)
      return resolved(false);
    else if(ch.push(val))
      return resolved(true);
    else
      return unresolved;
  };
};

exports.pushAsync = function(ch, val, cb) {
  try {
    go(function*() {
      yield push(ch, val);
      if (cb)
        cb(null);
    });
  } catch (err) {
    if (cb)
      cb(err);
    else
      throw new Error(err);
  }
};

var pull = exports.pull = function(ch) {
  return function() {
    var res = ch.pull();
    if (res.length > 0)
      return resolved(res[0]);
    else if (ch.isClosed)
      return resolved();
    else
      return unresolved;
  };
};

var close = exports.close = function(ch) {
  ch.isClosed = true;
  if (ch.onClose)
    ch.onClose();
};


exports.timeout = function(ms) {
  var t;
  var ch = chan(0);

  ch.onClose = function() {
    clearTimeout(t);
  };

  t = setTimeout(function() {
    close(ch);
  }, ms);

  return ch;
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
