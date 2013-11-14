'use strict';

var cc = require('./core');
var cf = require('./filters');


var closeAll = function(chs) {
  if (Array.isArray(chs))
    chs.forEach(function(ch) { ch.close(); });
  else
    chs.close();
};

var sentinel = function*(inch, outch, done, keepOpen) {
  yield done.pull();
  if (!keepOpen)
    closeAll(inch);
  closeAll(outch);
  done.close();
};

var pipe = exports.pipe = function()
{
  var args     = Array.prototype.slice.call(arguments);
  var filter   = args.shift();
  var keepOpen = args.pop();
  var inch     = args.pop();

  var outch = cc.chan();
  var done  = cc.chan();

  var inchs = (Array.isArray(inch) && inch.length > 0) ? [inch] : inch;

  cc.go.apply(this, [].concat(filter, args, inchs, outch, done));
  cc.go(sentinel, inch, outch, done, keepOpen);

  return outch;
};

exports.source = function(gen, keepOpen) {
  return pipe(cf.source, gen, [], keepOpen);
};

exports.map = function(fn, ch, keepOpen) {
  return pipe(cf.map, fn, ch, keepOpen);
};

exports.filter = function(pred, ch, keepOpen) {
  return pipe(cf.filter, pred, ch, keepOpen);
};

exports.take = function(n, ch, keepOpen) {
  return pipe(cf.take, n, ch, keepOpen);
};

exports.merge = function(chs, keepOpen) {
  return pipe(cf.merge, chs, keepOpen);
};

exports.combine = function(chs, keepOpen) {
  return pipe(cf.combine, chs, keepOpen);
};

exports.zip = function(chs, keepOpen) {
  return pipe(cf.zip, chs, keepOpen);
};

exports.scatter = function(preds, inch, keepOpen) {
  var outchs = preds.map(function () { return cc.chan(); });
  var done = cc.chan();

  cc.go(cf.scatter, preds, inch, outchs, done);
  cc.go(sentinel, inch, outchs, done, keepOpen);

  return outchs;
};

exports.each = function(fn, ch, keepOpen) {
  var done  = cc.chan();

  cc.go(cf.each, fn, ch, done);
  cc.go(sentinel, ch, done, done, keepOpen);

  return done;
};
