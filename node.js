'use strict'

var cc = require('./core');

var apply = exports.apply = function(fn, context, args) {
  var ch = cc.chan(1);
  var callback = function(err, val) {
    ch.pushSync(err ? cc.wrapError(new Error(err)) : cc.wrapValue(val));
  };
  fn.apply(context, args.concat(callback));
  return cc.unwrap(ch);
};

var call = exports.call = function(fn, context) {
  var args = Array.prototype.slice.call(arguments, 2);
  return apply(fn, context, args);
};

exports.bind = function(fn, context)
{
  return call.bind(null, fn, context);
};

exports.fromStream = function(stream)
{
  var ch = cc.chan();

  stream.on('data', function(chunk) {
    cc.go(function*() {
      yield ch.push(chunk);
    });
  });

  stream.on('end', function() {
    ch.close();
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};
