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

  cc.push(done, true);
};

var lessThan = function(n) {
  return function(m) {
    return m < n;
  }
};

var n = parseInt(process.argv[2] || "50");
var start = parseInt(process.argv[3] || "2");

cc.chain(cc.pipe(sieve, [], false),
         [cc.dropWhile, lessThan(start)],
         [cc.take, n],
         [cc.each, console.log]);
