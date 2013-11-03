// Concurrent prime sieve, loosely based on http://golang.org/doc/play/sieve.go

var cc = require("../core");
var cu = require("../util");

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

var test = function(prime) {
  return function(i) {
    return i % prime != 0;
  };
};

var sieve = function*(n) {
  var ctrl = cc.chan(0);
  var ch   = cu.source(infiniteRange(2), ctrl);
  var prime;

  console.log("The first " + n + " prime numbers:");

  for (var i = 0; i < n; i++) {
    prime = yield ch.take();
    console.log(prime);
    ch = cu.filter(test(prime), ch);
  }

  ctrl.close();
};

cc.go(sieve, parseInt(process.argv[2] || "50"));
