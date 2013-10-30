var csp = require('../csp');
var cspn = require('../node');

csp.go(function* () {
  var ch, val;

  process.stdin.setEncoding('utf8');
  ch = cspn.fromStream(process.stdin);

  while (ch.more()) {
    val = yield ch.take();
    if (val !== null)
      console.log(val);
  }
});
