// Concurrent prime sieve, loosely based on http://golang.org/doc/play/sieve.go

'use strict'

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
  var ch  = cu.source(infiniteRange(2));
  var prime;

  console.log("The first " + n + " prime numbers:");

  for (var i = 0; i < n; i++) {
    prime = yield ch.pull();
    console.log(prime);
    ch = cu.filter(test(prime), ch, true);
  }
  ch.close();
};

cc.go(sieve, parseInt(process.argv[2] || "50"));
