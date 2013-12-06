'use strict';

var cc = require('./core');
var cf = require('./raw_filters');


var closeAll = function(chs) {
  if (Array.isArray(chs))
    chs.forEach(function(ch) { cc.close(ch); });
  else
    cc.close(chs);
};

var sentinel = function*(inch, outch, done, options) {
  yield cc.pull(done);
  if (!options.keepInput)
    closeAll(inch);
  if (!options.keepOutput)
    closeAll(outch);
  cc.close(done);
};

var wrapch = function(ch) {
  return (Array.isArray(ch) && ch.length > 0) ? [ch] : ch;
};

var pipe = exports.pipe = function()
{
  var args    = Array.prototype.slice.call(arguments);
  var filter  = args.shift();
  var options = args.pop();
  var inch    = args.pop();

  var outch = options.output || cc.chan();
  var done  = cc.chan();

  cc.go.apply(this, [].concat(filter, args, wrapch(inch), wrapch(outch), done));
  cc.go(sentinel, inch, outch, done, options);

  return outch;
};

exports.source = function(gen, options) {
  return pipe(cf.source, gen, [], options || {});
};

exports.map = function(fn, ch, options) {
  return pipe(cf.map, fn, ch, options || {});
};

exports.filter = function(pred, ch, options) {
  return pipe(cf.filter, pred, ch, options || {});
};

exports.take = function(n, ch, options) {
  return pipe(cf.take, n, ch, options || {});
};

exports.takeWhile = function(pred, ch, options) {
  return pipe(cf.takeWhile, pred, ch, options || {});
};

exports.takeWhileOpen = function(ctrlch, inch, options) {
  return pipe(cf.takeWhileOpen, ctrlch, inch, options || {});
};

exports.drop = function(n, ch, options) {
  return pipe(cf.drop, n, ch, options || {});
};

exports.dropWhile = function(pred, ch, options) {
  return pipe(cf.dropWhile, pred, ch, options || {});
};

exports.merge = function(chs, options) {
  return pipe(cf.merge, chs, options || {});
};

exports.combine = function(chs, options) {
  return pipe(cf.combine, chs, options || {});
};

exports.zip = function(chs, options) {
  return pipe(cf.zip, chs, options || {});
};

exports.scatter = function(preds, inch, options) {
  var outchs = preds.map(function () { return cc.chan(); });
  var done = cc.chan();

  cc.go(cf.scatter, preds, inch, outchs, done);
  cc.go(sentinel, inch, outchs, done, options || {});

  return outchs;
};

exports.each = function(fn, ch, options) {
  var done  = cc.chan();

  cc.go(cf.each, fn, ch, done);
  cc.go(sentinel, ch, done, done, options || {});

  return done;
};
