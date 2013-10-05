var fs  = require('fs');
var csp = require('./csp');


var sync = function(fn, args) {
  var ch = csp.chan();
  csp.wrap_async(ch, fn, args);
  return ch.take();
}

csp.go(function* () {
  console.log(yield sync(fs.readFile, [process.argv[2], { encoding: 'utf8' }]));
})
