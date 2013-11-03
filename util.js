var cc = require('./core');

exports.timeout = function(milliseconds) {
  var ch = cc.chan(0);
  var t = setTimeout(function() { clearTimeout(t); ch.close(); }, milliseconds);
  return ch;
};

exports.source = function(gen, ctrl) {
  var ch = cc.chan();

  cc.go(function*() {
    for (x of gen) {
      if (ctrl && (yield cc.select([ctrl], null)))
        break;
      yield ch.push(x);
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

exports.map = function(fn, ch) {
  var outch = cc.chan();

  cc.go(function*() {
    var val;
    while((val = yield ch.pull()) !== undefined)
      yield outch.push(fn(val));
    outch.close();
  });

  return outch;
};

exports.filter = function(pred, ch) {
  var outch = cc.chan();

  cc.go(function*() {
    var val;
    while((val = yield ch.pull()) !== undefined)
      if (pred(val))
        yield outch.push(val);
    outch.close();
  });

  return outch;
};

exports.merge = function(inchs) {
  var outch = cc.chan();
  var active = inchs.slice();

  cc.go(function*() {
    while (active.length > 0) {
      var res = yield cc.select(active);
      if (res.value === undefined)
        active.splice(res.index, 1);
      else
        yield outch.push(res.value);
    }

    outch.close();
  });

  return outch;
};

exports.zip = function(inchs) {
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
          return;
        }

        i = res.index;
        results[indices[i]] = res.value;
        active.splice(i, 1);
        indices.splice(i, 1);
      }

      yield outch.push(results);
    }
  });

  return outch;
};
