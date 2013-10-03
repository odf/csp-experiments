// Concurrent prime sieve.
// http://golang.org/doc/play/sieve.go

var csp = require("./csp");

var generate = function* (ch) {
  for (var i = 2;;i++) {
    yield ch.put(i);
  }
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
};

var sieve = function* () {
  var ch = csp.chan();
  csp.go(generate, [ch]);
  for (var i = 0; i < 50; i++) {
    var prime = yield ch.take();
    console.log(prime);
    var ch1 = csp.chan();
    csp.go(filter, [ch, ch1, prime]);
    ch = ch1;
  }
};

csp.go(sieve);
