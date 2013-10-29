// Concurrent prime sieve, based on http://golang.org/doc/play/sieve.go
//
// Added an explicit control channel to shut down the chain of "goroutines".

var csp = require("../src/csp");

var generate = function*(ch, ctrl) {
  var i = 2;

  while (ctrl.more()) {
    yield ch.put(i);
    i += 1;
  }

  ch.close();
};

var filter = function*(inch, outch, prime) {
  while (inch.more()) {
    var i = yield inch.take();
    if (i % prime != 0)
      yield outch.put(i);
  }

  outch.close();
};

var sieve = function*() {
  var n, ch, ctrl, prime, ch1;

  n    = parseInt(process.argv[2] || "50");
  ch   = csp.chan();
  ctrl = csp.chan();

  console.log("The first " + n + " prime numbers:");

  csp.go(generate, ch, ctrl);

  for (var i = 0; i < n; i++) {
    prime = yield ch.take();
    console.log(prime);
    
    ch1 = csp.chan();
    csp.go(filter, ch, ch1, prime);
    ch = ch1;
  }

  ctrl.close();
};

csp.go(sieve);
