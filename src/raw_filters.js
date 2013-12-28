'use strict';

var go = require('./core').go;
var cc = require('./channels');

exports.source = function*(gen, outch, done) {
  for (;;) {
    var step = gen.next();
    if (step.done || !(yield cc.push(outch, step.value)))
      break;
  }
  yield cc.push(done, true);
};

exports.map = function*(fn, inch, outch, done) {
  var val;
  while((val = yield cc.pull(inch)) !== undefined)
    if(!(yield cc.push(outch, fn(val))))
      break;
  yield cc.push(done, true);
};

exports.filter = function*(pred, inch, outch, done) {
  var val;
  while((val = yield cc.pull(inch)) !== undefined)
    if (pred(val))
      if (!(yield cc.push(outch, val)))
        break;
  yield cc.push(done, true);
};

exports.reductions = function*(fn, inch, outch, done) {
  var val, acc;
  while ((val = yield cc.pull(inch)) !== undefined) {
    if (acc === undefined)
      acc = val;
    else
      acc = fn(acc, val);
    if (!(yield cc.push(outch, acc)))
      break;
  }
  yield cc.push(done, true);
};

exports.take = function*(n, inch, outch, done) {
  var val, i;
  for (i = 0; i < n; ++i) {
    val = yield cc.pull(inch);
    if (val === undefined || !(yield cc.push(outch, val)))
      break;
  }
  yield cc.push(done, true);
};

exports.takeWithTimeout = function*(ms, inch, outch, done) {
  var t = cc.timeout(ms);
  var val;
  while((val = (yield cc.select(t, inch)).value) !== undefined)
    if (!(yield cc.push(outch, val)))
      break;
  yield cc.push(done, true);
};

var rest = function(taker) {
  return function*(arg, inch, outch, done) {
    var sink = cc.chan(0);
    var sunk = cc.chan();
    go(taker, arg, inch, sink, sunk);
    yield cc.pull(sunk);
    go(exports.map, function(x) { return x; }, inch, outch, done);
  };
};

exports.drop = rest(exports.take);
exports.dropWithTimeout = rest(exports.takeWithTimeout);

exports.takeUntil = function*(pred, inch, outch, done) {
  var val;
  while((val = yield cc.pull(inch)) !== undefined)
    if (!(yield cc.push(outch, val)) || pred(val))
      break;
  yield cc.push(done, true);
};

exports.dropWhile = function*(pred, inch, outch, done) {
  var val;
  var go = false;
  while((val = yield cc.pull(inch)) !== undefined) {
    go = go || !pred(val);
    if (go && !(yield cc.push(outch, val)))
      break;
  }
  yield cc.push(done, true);
};

exports.merge = function*(inchs, outch, done) {
  var active = cc.chan();

  inchs.forEach(function(ch) {
    go(function*() {
      var val;
      while((val = (yield cc.select(active, ch)).value) !== undefined)
        if (!(yield cc.push(outch, val)))
          break;
      active.close();
    });
  });

  yield cc.pull(active);
  yield cc.push(done, true);
};

exports.combine = function*(inchs, outch, done) {
  var result = new Array(inchs.length);
  var active = cc.chan();

  var run = function(i) {
    go(function*() {
      var val;
      while((val = (yield cc.select(active, inchs[i])).value) !== undefined) {
        result[i] = val;
        if (!(yield cc.push(outch, result.slice())))
          break;
      }
      active.close();
    });
  };

  for (var i = 0; i < inchs.length; ++i)
    run(i);

  yield cc.pull(active);
  yield cc.push(done, true);
};

exports.zip = function*(inchs, outch, done) {
  var merged = cc.chan();
  var n = inchs.length;
  var val = new Array(n);
  var i, terminate;

  var read = function(i) {
    go(function*() {
      yield cc.push(merged, [i, yield cc.pull(inchs[i])]);
    });
  };

  while (true) {
    for (i = 0; i < n; ++ i)
      read(i);

    terminate = yield go(function*() {
      for (var k = 0; k < n; ++k) {
        var t = yield cc.pull(merged);
        val[t[0]] = t[1];
        if (t[1] === undefined)
          return true;
      }
      return false;
    });

    if (terminate || !(yield cc.push(outch, val.slice())))
      break;
  }

  yield cc.push(done, true);
};

exports.scatter = function*(preds, inch, outchs, done) {
  preds = preds.slice();
  outchs = outchs.slice();

  var val;
  while(preds.length > 0 && (val = yield cc.pull(inch)) !== undefined) {
    for (var i = 0; i < preds.length; ++i) {
      if ((preds[i] == true) || preds[i](val)) {
        if (!(yield cc.push(outchs[i], val))) {
          preds.splice(i, 1);
          outchs.splice(i, 1);
        }
        break;
      }
    }
  }
  yield cc.push(done, true);
};

exports.each = function*(fn, inch, done) {
  var val;
  while ((val = yield cc.pull(inch)) !== undefined)
    fn(val);
  yield cc.push(done, true);
};
