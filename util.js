'use strict'

var cc = require('./core');

exports.timeout = function(milliseconds) {
  var ch = cc.chan(0);
  var t = setTimeout(function() { clearTimeout(t); ch.close(); }, milliseconds);
  return ch;
};

exports.source = function(gen, ctrl) {
  var ch = cc.chan();

  cc.go(function*() {
    for (var x of gen) {
      if (ctrl && (yield cc.select([ctrl], null)))
        break;
      if (!(yield ch.push(x)))
        break;
    }
    ch.close();
  });

  return ch;
};

exports.each = function(fn, ch) {
  var done = cc.chan(0);

  cc.go(function*() {
    var val;
    while((val = yield ch.pull()) !== undefined)
      fn(val);
    done.close();
  });

  return done;
};

exports.map = function(fn, ch, closeInput) {
  var outch = cc.chan();

  cc.go(function*() {
    var val;
    while((val = yield ch.pull()) !== undefined)
      if (!(yield outch.push(fn(val))))
        break;
    if (closeInput)
      ch.close();
    outch.close();
  });

  return outch;
};

exports.filter = function(pred, ch, closeInput) {
  var outch = cc.chan();

  cc.go(function*() {
    var val;
    while((val = yield ch.pull()) !== undefined)
      if (pred(val))
        if (!(yield outch.push(val)))
          break;
    if (closeInput)
      ch.close();
    outch.close();
  });

  return outch;
};

exports.take = function(n, ch, closeInput) {
  var outch = cc.chan();

  cc.go(function*() {
    var val, i;
    for (i = 0; i < n; ++i) {
      val = yield ch.pull();
      if (val === undefined || !(yield outch.push(val)))
        break;
    }
    if (closeInput)
      ch.close();
    outch.close();
  });

  return outch;
};

exports.merge = function(inchs, closeInputs) {
  var outch = cc.chan();
  var active = inchs.slice();

  cc.go(function*() {
    while (active.length > 0) {
      var res = yield cc.select(active);
      if (res.value === undefined)
        active.splice(res.index, 1);
      else
        if (!(yield outch.push(res.value)))
          break;
    }

    if (closeInputs)
      for (var ch of active.values())
        ch.close();
    outch.close();
  });

  return outch;
};

exports.zip = function(inchs, closeInputs) {
  var outch = cc.chan();

  cc.go(function*() {
    var results, active, indices, i, res;

    results = new Array(inchs.length);

    while (true) {
      active  = inchs.slice();
      indices = []
      for (i = 0; i < inchs.length; ++i)
        indices.push(i);

      while (active.length > 0) {
        res = yield cc.select(active);

        if (res.value === undefined) {
          outch.close();
          break;
        }

        i = res.index;
        results[indices[i]] = res.value;
        active.splice(i, 1);
        indices.splice(i, 1);
      }

      if (!(yield outch.push(results)))
        break;
    }
    if (closeInputs)
      for (var ch of inchs.values())
        ch.close();
    outch.close();
  });

  return outch;
};
