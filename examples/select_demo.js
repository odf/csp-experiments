var csp = require('../csp');

var merge = function(inchs) {
  var outch = csp.chan();
  var active = inchs.slice();

  csp.go(function*() {
    while (active.length > 0) {
      var res = yield csp.select(active);
      if (res.value == null) {
        if (!active[res.index].more()) {
          active.splice(res.index, 1);
        }
      } else {
        yield outch.put(res.value);
      }
    }

    outch.close();
  });

  return outch;
};

var zip = function(inchs) {
  var outch = csp.chan();

  csp.go(function*() {
    var results, active, indices, i, res;

    results = new Array(inchs.length);

    while (true) {
      active  = inchs.slice();
      indices = []
      for (i = 0; i < inchs.length; ++i)
        indices.push(i);

      while (active.length > 0) {
        res = yield csp.select(active);
        i = res.index;

        if (res.value == null && !active[i].more()) {
          outch.close();
          return;
        }

        results[indices[i]] = res.value;
        active.splice(i, 1);
        indices.splice(i, 1);
      }

      yield outch.put(results);
    }
  });

  return outch;
};


var print = function*(ch) {
  while(ch.more())
    console.log(yield ch.take());
}

var timeout = function(milliseconds) {
  var ch = csp.chan(0);
  var t = setTimeout(function() { clearTimeout(t); ch.close(); }, milliseconds);
  return ch;
};


var f = function*(ch, x) {
  for (var i = 0; i < 20; ++i) {
    yield timeout(Math.random() * 100).take();
    yield ch.put(i + x);
  }
  ch.close();
};

var chans = [];

for (var i = 0; i < 3; ++i) {
  var ch = csp.chan();
  chans.push(ch);
  csp.go(f, ch, i / 10);
}

if (process.argv[2] == 'b')
  csp.go(print, zip(chans));
else
  csp.go(print, merge(chans));
