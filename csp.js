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
    var arr   = step.value(),
        state = arr[0],
        value = arr[1];

    switch (state) {
      case "park":
        setImmediate(function() { go_(machine, step); });
        return;
      case "continue":
        step = machine.next(value);
        break;
    }
  }
}


exports.chan = function() {
  return new Chan();
}

exports.go = function(machine, args) {
  var gen = machine.apply(undefined, args);
  go_(gen, gen.next());
}
