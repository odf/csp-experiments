'use strict';

var core = require('./core');
var cc   = require('./channels');


var apply = exports.apply = function(fn, context, args) {
  var result = core.defer();

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

  stream.on('readable', function() {
    core.go(function*() {
      var chunk;
      while (null !== (chunk = stream.read()))
        yield cc.push(ch, chunk);
    });
  });

  stream.on('end', function() {
    if (!keepOpen)
      core.go(function*() { cc.close(ch); });
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};
