'use strict';

var cc = require('./core');
var cb = require('./buffers');


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

exports.pull = function(ch) {
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

exports.close = function(ch) {
  ch.isClosed = true;
};
