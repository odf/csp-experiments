var csp = require('./csp');

var callback = function(ch) {
  return function(err, val) {
    csp.go(function*() {
      yield ch.put(err ? csp.wrapError(new Error(err)) : csp.wrapValue(val));
    });
  }
};

var apply = exports.apply = function(fn, context, args) {
  var ch = csp.chan();
  fn.apply(context, args.concat(callback(ch)));
  return csp.unwrap(ch);
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
  var ch = csp.chan();

  stream.on('data', function(chunk) {
    csp.go(function*() {
      yield ch.put(chunk);
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