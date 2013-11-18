'use strict';

var cc = require('./core');

exports.source = function*(gen, outch, done) {
  for (var val of gen)
    if (!(yield outch.push(val)))
      break;
  yield done.push(true);
};

exports.map = function*(fn, inch, outch, done) {
  var val;
  while((val = yield inch.pull()) !== undefined)
    if(!(yield outch.push(fn(val))))
      break;
  yield done.push(true);
};

exports.filter = function*(pred, inch, outch, done) {
  var val;
  while((val = yield inch.pull()) !== undefined)
    if (pred(val))
      if (!(yield outch.push(val)))
        break;
  yield done.push(true);
};

exports.take = function*(n, inch, outch, done) {
  var val, i;
  for (i = 0; i < n; ++i) {
    val = yield inch.pull();
    if (val === undefined || !(yield outch.push(val)))
      break;
  }
  yield done.push(true);
};

exports.takeWhile = function*(pred, inch, outch, done) {
  var val;
  while((val = yield inch.pull()) !== undefined)
    if (!pred(val) || !(yield outch.push(val)))
      break;
  yield done.push(true);
};

exports.drop = function*(n, inch, outch, done) {
  var val, i = 0;
  while((val = yield inch.pull()) !== undefined) {
    if (i < n)
      i += 1;
    else if (!(yield outch.push(val)))
      break;
  }
  yield done.push(true);
};

exports.dropWhile = function*(pred, inch, outch, done) {
  var val, go = false;
  while((val = yield inch.pull()) !== undefined) {
    go = go || !pred(val);
    if (go && !(yield outch.push(val)))
      break;
  }
  yield done.push(true);
};

exports.merge = function*(inchs, outch, done) {
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

exports.combine = function*(inchs, outch, done) {
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

exports.zip = function*(inchs, outch, done) {
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

exports.scatter = function*(preds, inch, outchs, done) {
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

exports.each = function*(fn, inch, done) {
  var val;
  while ((val = yield inch.pull()) !== undefined)
    fn(val);
  yield done.push(true);
};
