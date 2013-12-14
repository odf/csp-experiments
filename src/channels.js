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


// TODO all of the following should go into a separate file

exports.pass = function(ms) {
  var t;
  var result = cc.unresolved;

  t = setTimeout(function() {
    clearTimeout(t);
    result = cc.resolved();
  }, ms);

  return function() {
    return result;
  };
};


exports.select = function(actions) {
  return function() {
    for (var i = 0; i < actions.length; ++i) {
      var res = actions[i]();
      if (cc.isResolved(res))
        return cc.resolved({ index: i, value: cc.getValue(res) });
    }
    return cc.unresolved;
  }
};


exports.constant = function(val) {
  return function() {
    return cc.resolved(val);
  };
};
