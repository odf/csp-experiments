var csp = require('./csp');

var N = 3;

var f = function* (ch, x) {
  for (var i = 0; i < 20; ++i) {
    yield csp.timeout(Math.random() * 100).take();
    yield ch.put(i + x);
  }
  ch.close();
}

var merge = function* (inchs, outch) {
  var active = inchs.slice();

  while (active.length > 0) {
    var res = yield csp.select(active);
    if (res.value == null)
      active.splice(res.index, 1);
    else
      yield outch.put(res.value);
  }

  yield outch.put(null);
}

var all = function* (inchs, outch) {
  var results = new Array(inchs.length);
  var active  = inchs.slice();
  var indices = []
  for (var i = 0; i < inchs.length; ++i)
    indices.push(i);

  while (active.length > 0) {
    var res = yield csp.select(active);
    var i = res.index;
    results[indices[i]] = res.value;
    active.splice(i, 1);
    indices.splice(i, 1);
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
      console.log(val);
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
