// Concurrent prime sieve, loosely based on http://golang.org/doc/play/sieve.go

'use strict';

var cc = require("../core");
var cf = require("../filters");

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

var test = function(prime) {
  return function(i) {
    return i % prime != 0;
  };
};

var sieve = function*(outch, done) {
  var ch  = cf.source(infiniteRange(2));
  var prime;

  for (;;) {
    prime = yield ch.pull();
    if (!(yield outch.push(prime)))
      break;
    ch = cf.filter(test(prime), ch);
  }
  ch.close();

  yield done.push(true);
};

var n = parseInt(process.argv[2] || "50");
var start = parseInt(process.argv[3] || "2");

var primes = cf.pipe(sieve, [], false);

cf.each(console.log,
        cf.take(n, cf.dropWhile(function(p) { return p < start; }, primes)));
