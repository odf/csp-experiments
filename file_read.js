var fs  = require('fs');
var csp = require('./csp');


var sync = function(fn, args) {
  var channels = csp.apply(fn, args);

  return function() {
    var res = csp.select([channels.out, channels.err])();
    var state = res[0];
    var val = res[1];

    if (state == "continue") {
      var ch = val[0];
      var out = val[1];
      if (ch == channels.err) {
        return ["error", out];
      } else {
        return ["continue", out];
      }
    } else {
      return [state, out];
    }
  }
}

csp.go(function* () {
  console.log(yield sync(fs.readFile, [process.argv[2], { encoding: 'utf8' }]));
})
