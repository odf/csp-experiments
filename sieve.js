// Concurrent prime sieve.
// http://golang.org/doc/play/sieve.go

var csp = require("./csp");

var generate = function* (ch) {
  for (var i = 2;;i++) {
    yield csp.put(ch, i);
  }
};

var filter = function* (inch, outch, prime) {
  for (;;) {
    var i = yield csp.take(inch);
    if (i == null) {
      break;
    } else if (i % prime != 0) {
      yield csp.put(outch, i);
    }
  }
};

var sieve = function* () {
  var ch = [];
  csp.go(generate, [ch]);
  for (var i = 0; i < 50; i++) {
    var prime = yield csp.take(ch);
    console.log(prime);
    var ch1 = [];
    csp.go(filter, [ch, ch1, prime]);
    ch = ch1;
  }
};

csp.go(sieve);
