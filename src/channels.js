'use strict';

var cc = require('./core');
var cb = require('./buffers');


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
      return cc.rejected(new Error("push() requires an argument"));
    else if (ch.isClosed)
      return cc.resolved(false);
    else if(ch.push(val))
      return cc.resolved(true);
    else
      return cc.unresolved;
  };
};

exports.pushAsync = function(ch, val, cb) {
  try {
    cc.go(function*() {
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
      return cc.resolved(res[0]);
    else if (ch.isClosed)
      return cc.resolved();
    else
      return cc.unresolved;
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


exports.pass = function(ms) {
  return pull(exports.timeout(ms));
};


exports.select = function(ops, default_value) {
  return function() {
    for (var i = 0; i < ops.length; ++i) {
      var op = ops[i];
      var res = (Array.isArray(op)) ? push(op[0], op[1])() : pull(op)();
      if (cc.isResolved(res))
        return cc.resolved({ index: i, value: cc.getValue(res) });
    }
    if (default_value === undefined)
      return cc.unresolved;
    else
      return cc.resolved(default_value);
  }
};


exports.unwrap = function(ch) {
  return function() {
    var res = pull(ch)();
    return cc.isResolved(res) ? cc.getValue(res) : res;
  };
};
