var csp = require('./csp');

var N = 3;

var f = function* (ch, x) {
  for (var i = 0; i < 20; ++i) {
    yield csp.timeout(Math.random() * 100).take();
    yield ch.put(i + x);
  }
  ch.close()
}

var chans = [];

for (var i = 0; i < N; ++i) {
  var ch = csp.chan();
  chans.push(ch);
  csp.go(f, [ch, i / 10]);
}

var main = function* () {
  var active = chans.slice();

  while (active.length > 0) {
    var res = yield csp.select(active);
    var ch  = res[0];
    var val = res[1];
    if (val == null) {
      for (var i = 0; i < N; ++i) {
        if (ch == active[i]) {
          active.splice(i, 1);
        }
      }
    } else {
      console.log(val);
    }
  }
}

csp.go(main)
