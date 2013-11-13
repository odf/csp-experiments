'use strict';

var cb = require('./buffers');

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


function Chan(buffer) {
  this.buffer = buffer;
  this.isClosed = false;
};

Chan.prototype.push = function(val) {
  return function() {
    if (val === undefined)
      return { state: "error", value: new Error("push() requires an argument") };
    else if (this.isClosed)
      return { state: "continue", value: false };
    else if(this.buffer.tryToPush(val))
      return { state: "continue", value: true };
    else
      return { state: "park" };
  }.bind(this);
};

Chan.prototype.pushSync = function(val) {
  if (val === undefined)
    throw new Error("synchronous push requires an argument");
  else if (this.isClosed)
    throw new Error("synchronous push to closed channel");
  else if (!this.buffer.tryToPush(val))
    throw new Error("synchronous push failed");
};

Chan.prototype.pull = function() {
  return function() {
    var res = this.buffer.tryToPull();
    if (res.length > 0)
      return { state: "continue", value: res[0] };
    else if (this.isClosed)
      return { state: "continue" };
    else
      return { state: "park" };
  }.bind(this);
};

Chan.prototype.pullSync = function() {
  var res = this.buffer.tryToPull();
  if (res.length > 0)
    return res[0];
  else
    throw new Error("synchronous pull failed");
};

Chan.prototype.close = function() {
  this.isClosed = true;
};


exports.go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
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

  return new Chan(buffer);
};


exports.pass = function(milliseconds) {
  return function() {
    return { state: "pass", value: milliseconds || 0 };
  };
};

exports.select = function(channels, default_value) {
  return function() {
    for (var i = 0; i < channels.length; ++i) {
      var res = channels[i].pull()();
      if (res.state == "continue") {
        return { state: "continue",
                 value: { index:   i,
                          channel: channels[i],
                          value:   res.value } };
      }
    }
    if (default_value === undefined)
      return { state: "park" };
    else
      return { state: "continue", value: default_value };
  }
};

exports.wrapError = function(err) {
  return { state: "error", value: err };
};

exports.wrapValue = function(val) {
  return { state: "continue", value: val };
};

exports.unwrap = function(ch) {
  return function() {
    var res = ch.pull()();
    return (res.state == "continue") ? res.value : res;
  }
};
