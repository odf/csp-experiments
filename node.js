'use strict';

var cc = require('./core');

var apply = exports.apply = function(fn, context, args) {
  var result = cc.unresolved;

  var callback = function(err, val) {
    result = err ? cc.rejected(new Error(err)) : cc.resolved(val);
  };
  fn.apply(context, args.concat(callback));

  return function() { return result; };
};

var call = exports.call = function(fn, context) {
  var args = Array.prototype.slice.call(arguments, 2);
  return apply(fn, context, args);
};

exports.bind = function(fn, context)
{
  return call.bind(null, fn, context);
};

exports.fromStream = function(stream, outch, keepOpen)
{
  var ch = outch || cc.chan();

  stream.on('data', function(chunk) {
    cc.go(function*() {
      yield ch.push(chunk);
    });
  });

  stream.on('end', function() {
    if (!keepOpen)
      ch.close();
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};
