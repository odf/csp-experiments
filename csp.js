go_ = function(machine, step) {
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

exports.go = function(machine) {
  var gen = machine();
  go_(gen, gen.next());
}

exports.put = function(chan, val) {
  return function() {
    if(chan.length == 0) {
      chan.unshift(val);
      return ["continue", null];
    } else {
      return ["park", null];
    }
  };
}

exports.take = function(chan) {
  return function() {
    if(chan.length == 0) {
      return ["park", null];
    } else {
      var val = chan.pop();
      return ["continue", val];
    }
  };
}
