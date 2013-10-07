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
      return { state: "continue" };
    } else if (this.buffer.isFull()) {
      return { state: "park" };
    } else {
      this.buffer.add(val);
      return { state: "continue" };
    }
  }.bind(this);
}

Chan.prototype.take = function() {
  return function() {
    if (this.buffer.count() > 0) {
      var val = this.buffer.remove();
      return { state: "continue", value: val };
    } else if (this.isClosed) {
      return { state: "continue", value: null };
    } else {
      return { state: "park" };
    }
  }.bind(this);
}

Chan.prototype.close = function() {
  this.isClosed = true;
}


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
      var res = channels[i].take()();
      if (res.state == "continue") {
        return { state: "continue", value: [channels[i], res.value] };
      }
    }
    if (default_value === undefined)
      return { state: "park" };
    else
      return { state: "continue", value: default_value };
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
      ch.put({ state: "error", value: new Error(err) })();
    } else {
      ch.put({ state: "continue", value: val })();
    }
  }
}

var unwrap = function(ch) {
  return function() {
    var res = ch.take()();
    if (res.state == "continue") {
      return res.value;
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
