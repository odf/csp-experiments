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
    }
  }
}

exports.go = function(machine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
}


function Unbuffer() {
  this.pullPending = false;
  this.hasValue = false;
  this.value = null;
}

Unbuffer.prototype.isEmpty = function() {
  return !this.hasValue;
}

Unbuffer.prototype.tryToPush = function(val) {
  if (this.pullPending) {
    this.pullPending = false;
    this.hasValue = true;
    this.value = val;
    return true;
  } else {
    return false;
  }
}

Unbuffer.prototype.tryToPull = function() {
  if (this.hasValue) {
    this.pullPending = false;
    this.hasValue = false;
    return [this.value];
  } else {
    this.pullPending = true;
    return [];
  }
}


function Buffer(size) {
  this.size = size || 1;
  this.contents = [];
}

Buffer.prototype.isEmpty = function() {
  return this.contents.length == 0;
}

Buffer.prototype.tryToPush = function(val) {
  if (this.contents.length < this.size) {
    this.contents.unshift(val);
    return true;
  } else {
    return false;
  }
}

Buffer.prototype.tryToPull = function() {
  if (this.contents.length > 0)
    return [this.contents.pop()];
  else
    return [];
}


var nullBuffer = {
  isEmpty  : function() { return true; },
  tryToPush: function() { return false; },
  tryToPull: function() { return []; }
};


function Chan(arg) {
  if (arg == undefined)
    this.buffer = new Unbuffer();
  else if (typeof arg == "object")
    this.buffer = arg
  else if (arg === 0)
    this.buffer = nullBuffer;
  else
    this.buffer = new Buffer(arg || 1);
  this.isClosed = false;
}

Chan.prototype.push = function(val) {
  return function() {
    if (this.isClosed || this.buffer.tryToPush(val))
      return { state: "continue" };
    else
      return { state: "park" };
  }.bind(this);
}

Chan.prototype.pull = function() {
  return function() {
    var res = this.buffer.tryToPull();
    if (res.length > 0)
      return { state: "continue", value: res[0] };
    else if (this.isClosed)
      return { state: "continue", value: null };
    else
      return { state: "park" };
  }.bind(this);
}

Chan.prototype.close = function() {
  this.isClosed = true;
}

Chan.prototype.more = function() {
  return !(this.isClosed && this.buffer.isEmpty());
}

exports.chan = function(size) {
  return new Chan(size);
}


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
}

exports.wrapError = function(err) {
  return { state: "error", value: err };
}

exports.wrapValue = function(val) {
  return { state: "continue", value: val };
}

exports.unwrap = function(ch) {
  return function() {
    var res = ch.pull()();
    return (res.state == "continue") ? res.value : res;
  }
}
