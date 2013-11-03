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
  this.mayPush = false;
  this.mayPull = false;
  this.hasValue = false;
  this.value = null;
}

Unbuffer.prototype.canPull = function() {
  this.mayPush = true;
  return this.mayPull && this.hasValue;
}

Unbuffer.prototype.canPush = function() {
  this.mayPull = true;
  return this.mayPush;
}

Unbuffer.prototype.push = function(val) {
  if (this.canPush) {
    this.mayPush = false;
    this.hasValue = true;
    this.value = val;
  } else {
    throw new Error("attempt to write to full buffer");
  }
}

Unbuffer.prototype.pull = function() {
  if (this.canPull) {
    this.mayPull = false;
    this.hasValue = false;
    return this.value;
  } else {
    throw new Error("attempt to read from empty buffer");
  }
}


function Buffer(size) {
  this.size = size || 1;
  this.contents = [];
}

Buffer.prototype.canPull = function() {
  return this.contents.length > 0;
}

Buffer.prototype.canPush = function() {
  return this.contents.length < this.size;
}

Buffer.prototype.push = function(val) {
  if (this.canPush)
    this.contents.unshift(val);
  else
    throw new Error("attempt to write to full buffer");
}

Buffer.prototype.pull = function() {
  if (this.canPull)
    return this.contents.pop();
  else
    throw new Error("attempt to read from empty buffer");
}


function Chan(arg) {
  if (arg == undefined)
    this.buffer = new Unbuffer();
  else if (typeof arg == "object")
    this.buffer = arg
  else 
    this.buffer = new Buffer(arg || 1);
  this.isClosed = false;
}

Chan.prototype.put = function(val) {
  return function() {
    if (this.isClosed) {
      return { state: "continue" };
    } else if (this.buffer.canPush()) {
      this.buffer.push(val);
      return { state: "continue" };
    } else {
      return { state: "park" };
    }
  }.bind(this);
}

Chan.prototype.take = function() {
  return function() {
    if (this.buffer.canPull())
      return { state: "continue", value: this.buffer.pull() };
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
  return !this.isClosed || this.buffer.canPull();
}

exports.chan = function(size) {
  return new Chan(size);
}


exports.select = function(channels, default_value) {
  return function() {
    for (var i = 0; i < channels.length; ++i) {
      var res = channels[i].take()();
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
    var res = ch.take()();
    return (res.state == "continue") ? res.value : res;
  }
}
