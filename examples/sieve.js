// Concurrent prime sieve, based on http://golang.org/doc/play/sieve.go
//
// Added an explicit control channel to shut down the chain of "goroutines".

var cc = require("../core");
var cu = require("../util");

var generate = function*(ch, ctrl) {
  var i = 2;

  while (ctrl.more()) {
    yield ch.put(i);
    i += 1;
  }

  ch.close();
};

var test = function(prime) {
  return function(i) {
    return i % prime != 0;
  };
};

var sieve = function*() {
  var n, ch, ctrl, prime, ch1;

  n    = parseInt(process.argv[2] || "50");
  ch   = cc.chan();
  ctrl = cc.chan();

  console.log("The first " + n + " prime numbers:");

  cc.go(generate, ch, ctrl);

  for (var i = 0; i < n; i++) {
    prime = yield ch.take();
    console.log(prime);
    ch = cu.filter(test(prime), ch);
  }

  ctrl.close();
};

cc.go(sieve);
