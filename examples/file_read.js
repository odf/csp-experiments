var fs  = require('fs');
var csp = require('../src/csp');

var callback = function(ch) {
  return function(err, val) {
    csp.go(function*() {
      yield ch.put(err ? csp.wrapError(new Error(err)) : csp.wrapValue(val));
    });
  }
}

var apply = function(fn, context, args) {
  var ch = csp.chan();
  fn.apply(context, args.concat(callback(ch)));
  return csp.unwrap(ch);
}

var bind = function(fn, context)
{
  return function() {
    var args = Array.prototype.slice.call(arguments);
    return apply(fn, context, args);
  }
}

var readFile = bind(fs.readFile, fs);

csp.go(function* () {
  console.log(yield readFile(process.argv[2], { encoding: 'utf8' }));
})
