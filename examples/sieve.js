// Concurrent prime sieve, loosely based on http://golang.org/doc/play/sieve.go

'use strict';

var cc = require("../index");

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
  var ch  = cc.source(infiniteRange(2));
  var prime;

  for (;;) {
    prime = yield cc.pull(ch);
    if (!(yield cc.push(outch, prime)))
      break;
    ch = cc.filter(test(prime), ch);
  }
  cc.close(ch);

  yield cc.push(done, true);
};

var n = parseInt(process.argv[2] || "50");
var start = parseInt(process.argv[3] || "2");

var primes = cc.pipe(sieve, [], false);

cc.each(console.log,
        cc.take(n, cc.dropWhile(function(p) { return p < start; }, primes)));
