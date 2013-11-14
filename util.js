'use strict';

var cc = require('./core');
var cf = require('./filters');


exports.source = function(gen, ctrl) {
  var ch = cc.chan();
  ctrl = ctrl || cc.chan(0);

  cc.go(function*() {
    for (var x of gen) {
      var res = yield cc.select([ctrl, [ch, x]]);
      if (res.index == 0 || res.value == false)
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

var closeAll = function(chs) {
  if (chs.constructor == Array)
    chs.forEach(function(ch) { ch.close(); });
  else
    chs.close();
};

var sentinel = function*(inch, outch, done, keepOpen) {
  yield done.pull();
  if (!keepOpen)
    closeAll(inch);
  closeAll(outch);
};

var pipe = exports.pipe = function()
{
  var args     = Array.prototype.slice.call(arguments);
  var filter   = args.shift();
  var keepOpen = args.pop();
  var inch     = args.pop();

  var outch = cc.chan();
  var done  = cc.chan();

  cc.go.apply(this, [].concat(filter, args, [inch, outch, done]));
  cc.go(sentinel, inch, outch, done, keepOpen);

  return outch;
};

exports.map = function(fn, ch, keepInputOpen) {
  return pipe(cf.map, fn, ch, keepInputOpen);
};

exports.filter = function(pred, ch, keepInputOpen) {
  return pipe(cf.filter, pred, ch, keepInputOpen);
};

exports.take = function(n, ch, keepInputOpen) {
  return pipe(cf.take, n, ch, keepInputOpen);
};

exports.merge = function(inchs, keepInputsOpen) {
  return pipe(cf.merge, inchs, keepInputsOpen);
};

exports.combine = function(inchs, keepInputsOpen) {
  return pipe(cf.combine, inchs, keepInputsOpen);
};

exports.zip = function(inchs, keepInputsOpen) {
  return pipe(cf.zip, inchs, keepInputsOpen);
};

exports.scatter = function(preds, inch, keepOpen) {
  var outchs = preds.map(function () { return cc.chan(); });
  var done = cc.chan();

  cc.go(cf.scatter, preds, inch, outchs, done);
  cc.go(sentinel, inch, outchs, done, keepOpen);

  return outchs;
};
