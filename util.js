'use strict';

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

var wrap = exports.wrapTransformer = function(filter, args, inchs, keepOpen)
{
  var outch = cc.chan();
  var done = cc.chan();

  cc.go.apply(this, [filter].concat(args, [inchs], outch, done));
  cc.go(function*() {
    yield done.pull();
    if (!keepOpen)
      for (var ch of inchs.values())
        ch.close();
    outch.close();
  });

  return outch;
};

var raw = exports.raw = {};

raw.map = function*(fn, inchs, outch, done) {
  var val;
  while((val = yield inchs[0].pull()) !== undefined)
    if(!(yield outch.push(fn(val))))
      break;
  yield done.push(true);
};

exports.map = function(fn, ch, keepInputOpen) {
  return wrap(raw.map, [fn], [ch], keepInputOpen);
};

raw.filter = function*(pred, inchs, outch, done) {
  var val;
  while((val = yield inchs[0].pull()) !== undefined)
    if (pred(val))
      if (!(yield outch.push(val)))
        break;
  yield done.push(true);
};

exports.filter = function(pred, ch, keepInputOpen) {
  return wrap(raw.filter, [pred], [ch], keepInputOpen);
};

raw.take = function*(n, inchs, outch, done) {
  var val, i;
  for (i = 0; i < n; ++i) {
    val = yield inchs[0].pull();
    if (val === undefined || !(yield outch.push(val)))
      break;
  }
  yield done.push(true);
};

exports.take = function(n, ch, keepInputOpen) {
  return wrap(raw.take, [n], [ch], keepInputOpen);
};

raw.merge = function*(inchs, outch, done) {
  var active = inchs.slice();

  while (active.length > 0) {
    var res = yield cc.select(active);
    if (res.value === undefined)
      active.splice(res.index, 1);
    else
      if (!(yield outch.push(res.value)))
        break;
  }
  yield done.push(true);
};

exports.merge = function(inchs, keepInputsOpen) {
  return wrap(raw.merge, [], inchs, keepInputsOpen);
};

raw.combine = function*(inchs, outch, done) {
  var results, active, indices, i, res;

  active  = inchs.slice();
  indices = []
  for (i = 0; i < inchs.length; ++i)
    indices.push(i);

  results = new Array(inchs.length);

  while (active.length > 0) {
    res = yield cc.select(active);
    i = res.index;

    if (res.value === undefined) {
      active.splice(i, 1);
      indices.splice(i, 1);
    } else {
      results[indices[i]] = res.value;
      if (!(yield outch.push(results.slice())))
        break;
    }
  }
  yield done.push(true);
};

exports.combine = function(inchs, keepInputsOpen) {
  return wrap(raw.combine, [], inchs, keepInputsOpen);
};

raw.zip = function*(inchs, outch, done) {
  var results, active, indices, i, res;

  results = new Array(inchs.length);

  while (results !== null) {
    active  = inchs.slice();
    indices = []
    for (i = 0; i < inchs.length; ++i)
      indices.push(i);

    while (active.length > 0) {
      res = yield cc.select(active);

      if (res.value === undefined) {
        results = null;
        break;
      }

      i = res.index;
      results[indices[i]] = res.value;
      active.splice(i, 1);
      indices.splice(i, 1);
    }

    if (!(yield outch.push(results.slice())))
      break;
  }
  yield done.push(true);
};

exports.zip = function(inchs, keepInputsOpen) {
  return wrap(raw.zip, [], inchs, keepInputsOpen);
};

raw.scatter = function*(preds, inch, outchs, done) {
  preds = preds.slice();
  outchs = outchs.slice();

  var val;
  while(preds.length > 0 && (val = yield inch.pull()) !== undefined) {
    for (var i = 0; i < preds.length; ++i) {
      if ((preds[i] == true) || preds[i](val)) {
        if (!(yield outchs[i].push(val))) {
          preds.splice(i, 1);
          outchs.splice(i, 1);
        }
        break;
      }
    }
  }
  yield done.push(true);
};

exports.scatter = function(preds, inch, keepInputOpen) {
  var outchs = preds.map(function () { return cc.chan(); });
  var done = cc.chan();
  var ch;

  cc.go(raw.scatter, preds, inch, outchs, done);
  cc.go(function*() {
    yield done.pull();
    if (!keepInputOpen)
      inch.close();
    for (var ch of outchs.values())
      ch.close();
  });

  return outchs;
}
