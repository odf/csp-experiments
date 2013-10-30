var csp = require('../src/csp');
var cspn = require('../src/node');

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
