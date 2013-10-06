var fs  = require('fs');
var csp = require('./csp');


var sync = function(fn, args) {
  var outch = csp.chan();
  var errch = csp.chan();

  csp.apply_async(outch, errch, fn, args);

  return function() {
    var res = csp.select([outch, errch])();
    var state = res[0];
    var val = res[1];

    if (state == "continue") {
      var ch = val[0];
      var out = val[1];
      if (ch == errch) {
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
