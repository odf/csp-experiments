'use strict';

var go = require('./core').go;
var cc = require('./channels');
var ca = require('./actions');

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
  var actions = [ca.sleep(ms), cc.pull(inch)];
  var val;
  while((val = (yield ca.select(actions)).value) !== undefined)
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
  var active = inchs.map(cc.pull);

  while (active.length > 0) {
    var res = yield ca.select(active);
    if (res.value === undefined)
      active.splice(res.index, 1);
    else
      if (!(yield cc.push(outch, res.value)))
        break;
  }
  yield cc.push(done, true);
};

exports.combine = function*(inchs, outch, done) {
  var results, active, indices, i, res;

  active  = inchs.map(cc.pull);
  indices = []
  for (i = 0; i < inchs.length; ++i)
    indices.push(i);

  results = new Array(inchs.length);

  while (active.length > 0) {
    res = yield ca.select(active);
    i = res.index;

    if (res.value === undefined) {
      active.splice(i, 1);
      indices.splice(i, 1);
    } else {
      results[indices[i]] = res.value;
      if (!(yield cc.push(outch, results.slice())))
        break;
    }
  }
  yield cc.push(done, true);
};

exports.zip = function*(inchs, outch, done) {
  var results, active, indices, i, res;

  results = new Array(inchs.length);

  while (results !== null) {
    active  = inchs.map(cc.pull);
    indices = []
    for (i = 0; i < inchs.length; ++i)
      indices.push(i);

    while (active.length > 0) {
      res = yield ca.select(active);

      if (res.value === undefined) {
        results = null;
        break;
      }

      i = res.index;
      results[indices[i]] = res.value;
      active.splice(i, 1);
      indices.splice(i, 1);
    }

    if (!(yield cc.push(outch, results.slice())))
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
