var cc = require('../core');
var cn = require('../node');

cc.go(function* () {
  var ch, val;

  process.stdin.setEncoding('utf8');
  ch = cn.fromStream(process.stdin);

  while (ch.more()) {
    val = yield ch.take();
    if (val !== null)
      console.log(val);
  }
});
