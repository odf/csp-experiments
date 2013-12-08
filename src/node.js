'use strict';

var cr = require('./core');
var cc = require('./channels');


var apply = exports.apply = function(fn, context, args) {
  var ch = cc.chan();

  var callback = function(err, val) {
    cc.pushAsync(ch, err ? cr.rejected(new Error(err)) : cr.resolved(val));
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

exports.fromStream = function(stream, outch, keepOpen)
{
  var ch = outch || cc.chan();

  stream.on('data', cc.pushAsync.bind(null, ch));

  stream.on('end', function() {
    if (!keepOpen)
      cc.close(ch);
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};
