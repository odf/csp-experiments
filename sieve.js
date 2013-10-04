// Concurrent prime sieve, based on http://golang.org/doc/play/sieve.go
//
// Added an explicit control channel to shut down the chain of "goroutines".

var csp = require("./csp");

var generate = function* (ch, stop) {
  for (var i = 2;; i++) {
    if (yield csp.select([stop], false)) {
      break;
    }
    yield ch.put(i);
  }
  ch.close()
};

var filter = function* (inch, outch, prime) {
  for (;;) {
    var i = yield inch.take();
    if (i == null) {
      break;
    } else if (i % prime != 0) {
      yield outch.put(i);
    }
  }
  outch.close()
};

var sieve = function* () {
  var ch = csp.chan();
  var stop = csp.chan();
  csp.go(generate, [ch, stop]);

  var n = parseInt(process.argv[2] | "50")

  for (var i = 0; i < n; i++) {
    var prime = yield ch.take();
    console.log(prime);
    var ch1 = csp.chan();
    csp.go(filter, [ch, ch1, prime]);
    ch = ch1;
  }

  stop.close();
};

csp.go(sieve);
