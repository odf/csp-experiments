var csp = require('./csp');

var N = 3;

var f = function* (ch, x) {
  for (var i = 0; i < 20; ++i) {
    yield csp.timeout(Math.random() * 100).take();
    yield ch.put(i + x);
  }
  ch.close()
}

var merge = function* (inchs, outch) {
  var active = inchs.slice();

  while (active.length > 0) {
    var res = yield csp.select(active);
    var ch  = res[0];
    var val = res[1];
    if (val == null) {
      for (var i = 0; i < N; ++i) {
        if (ch == active[i]) {
          active.splice(i, 1);
          break;
        }
      }
    } else {
      yield outch.put(val);
    }
  }

  yield outch.put(null);
}

var all = function* (inchs, outch) {
  var active = inchs.slice();
  var indices = []
  for (var i = 0; i < inchs.length; ++i) {
    indices.push(i);
  }
  var results = new Array(inchs.length);

  while (active.length > 0) {
    var res = yield csp.select(active);
    var ch  = res[0];
    var val = res[1];

    for (var i = 0; i < active.length; ++i) {
      if (ch == active[i]) {
        results[indices[i]] = val;
        active.splice(i, 1);
        indices.splice(i, 1);
        break;
      }
    }
  }

  if (results.every(function(x) { return x === null; }))
    yield outch.put(null);
  else
    yield outch.put(results);
}


var chans = [];

for (var i = 0; i < N; ++i) {
  var ch = csp.chan();
  chans.push(ch);
  csp.go(f, [ch, i / 10]);
}

var a = function* () {
  var ch = csp.chan();
  csp.go(merge, [chans, ch]);

  while (true) {
    var val = yield ch.take();
    if (val === null)
      break;
    else
      console.log(val)
  }
}

var b = function* () {
  var ch = csp.chan();

  while(true) {
    csp.go(all, [chans, ch]);
    var val = yield ch.take();
    if (val == null)
      break;
    else
      console.log(val);
  };
}

if (process.argv[2] == 'b')
  csp.go(b);
else
  csp.go(a);
