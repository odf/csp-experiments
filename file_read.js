var fs  = require('fs');
var csp = require('./csp');


var sync = function(fn, args) {
  var channels = csp.apply(fn, args);
  return csp.consume(channels.out, channels.err);
}

csp.go(function* () {
  console.log(yield sync(fs.readFile, [process.argv[2], { encoding: 'utf8' }]));
})
