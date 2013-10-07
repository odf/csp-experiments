function Buffer(size) {
  this.size = size || 1;
  this.contents = [];
}

Buffer.prototype.count = function() {
  return this.contents.length;
}

Buffer.prototype.isFull = function() {
  return this.contents.length >= this.size;
}

Buffer.prototype.add = function(val) {
  if (this.isFull()) {
    throw new Error("attempt to write to full buffer");
  } else {
    this.contents.unshift(val);
  }
}

Buffer.prototype.remove = function() {
  if (this.count() == 0) {
    throw new Error("attempt to read from empty buffer");
  } else {
    return this.contents.pop();
  }
}


function Chan(size) {
  this.buffer = new Buffer(size || 1);
  this.isClosed = false;
}

Chan.prototype.put = function(val) {
  return function() {
    if (this.isClosed) {
      return ["continue", null];
    } else if (this.buffer.isFull()) {
      return ["park", null];
    } else {
      this.buffer.add(val);
      return ["continue", null];
    }
  }.bind(this);
}

Chan.prototype.take = function() {
  return function() {
    if (this.buffer.count() > 0) {
      var val = this.buffer.remove();
      return ["continue", val];
    } else if (this.isClosed) {
      return ["continue", null];
    } else {
      return ["park", null];
    }
  }.bind(this);
}

Chan.prototype.close = function() {
  this.isClosed = true;
}


var go_ = function(machine, step) {
  while(!step.done) {
    var arr   = step.value();
    var state = arr[0];
    var value = arr[1];

    switch (state) {
    case "error":
      machine.throw(value);
    case "park":
      setImmediate(function() { go_(machine, step); });
      return;
    case "continue":
      step = machine.next(value);
      break;
    }
  }
}

exports.go = function(machine, args) {
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
}


var chan = exports.chan = function(size) {
  return new Chan(size);
}

var select = exports.select = function(channels, default_value) {
  return function() {
    for (var i = 0; i < channels.length; ++i) {
      var arr = channels[i].take()();
      var state = arr[0];
      var value = arr[1];
      if (state != "park") {
        return [state, [channels[i], value]];
      }
    }
    if (default_value === undefined)
      return ["park", null];
    else
      return ["continue", default_value]
  }
}

exports.timeout = function(milliseconds) {
  var ch = chan(0);
  var t = setTimeout(function() { clearTimeout(t); ch.close(); }, milliseconds);
  return ch;
}

var callback = function(ch) {
  return function(err, val) {
    if (err) {
      ch.put(["error", new Error(err)])();
    } else {
      ch.put(["continue", val])();
    }
  }
}

var unwrap = function(ch) {
  return function() {
    var res = ch.take()();
    if (res[0] == "continue") {
      return res[1];
    } else {
      return res;
    }
  }
}

var apply = exports.apply = function(fn, context, args) {
  var ch = chan();
  fn.apply(context, args.concat(callback(ch)));
  return unwrap(ch);
}

exports.bind = function(fn, context)
{
  return function() {
    var args = Array.prototype.slice.call(arguments);
    return apply(fn, context, args);
  }
}
