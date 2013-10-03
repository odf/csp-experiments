var csp = require('./csp');

var f = function* (ch, x) {
  for (var i = 0; i < 20; ++i) {
    yield ch.put(i + x);
  }
  ch.close()
}

var chans = [1,2,3].map(function(i) { return csp.chan(); })
var xs = [1,2,3].map(function(i) { return i / 10; })

for (i = 0; i < 3; ++i) {
  csp.go(f, [chans[i], xs[i]]);
}

var main = function* () {
  while (true) {
    var res = yield csp.select(chans);
    var ch  = res[0];
    var val = res[1];
    if (val == null) {
      break;
    }
    console.log(val);
  }
}

csp.go(main)
