'use strict';

var go = require('./core').go;
var deferred = require('./deferred').deferred;
var cc = require('./channels');


var apply = exports.apply = function(fn, context, args) {
  var result = deferred();

  fn.apply(context, args.concat(function(err, val) {
    if (err)
      result.reject(new Error(err));
    else
      result.resolve(val);
  }));

  return result;
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

  stream.on('data', function(data) {
    go(function*() {
      yield cc.push(ch, data);
    });
  });

  stream.on('end', function() {
    if (!keepOpen)
      go(function*() {
        yield cc.close(ch);
      })
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};
