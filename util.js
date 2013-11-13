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

exports.map = function(fn, ch, keepInputOpen) {
  return wrap(cf.map, [fn], [ch], keepInputOpen);
};

exports.filter = function(pred, ch, keepInputOpen) {
  return wrap(cf.filter, [pred], [ch], keepInputOpen);
};

exports.take = function(n, ch, keepInputOpen) {
  return wrap(cf.take, [n], [ch], keepInputOpen);
};

exports.merge = function(inchs, keepInputsOpen) {
  return wrap(cf.merge, [], inchs, keepInputsOpen);
};

exports.combine = function(inchs, keepInputsOpen) {
  return wrap(cf.combine, [], inchs, keepInputsOpen);
};

exports.zip = function(inchs, keepInputsOpen) {
  return wrap(cf.zip, [], inchs, keepInputsOpen);
};

exports.scatter = function(preds, inch, keepInputOpen) {
  var outchs = preds.map(function () { return cc.chan(); });
  var done = cc.chan();
  var ch;

  cc.go(cf.scatter, preds, inch, outchs, done);
  cc.go(function*() {
    yield done.pull();
    if (!keepInputOpen)
      inch.close();
    for (var ch of outchs.values())
      ch.close();
  });

  return outchs;
};
