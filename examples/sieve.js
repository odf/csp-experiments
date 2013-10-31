// Concurrent prime sieve, loosely based on http://golang.org/doc/play/sieve.go

var cc = require("../core");
var cu = require("../util");

var source = function(ctrl) {
  var ch = cc.chan();

  cc.go(function*() {
    var i;
    for (i = 2; ; i += 1) {
      if (!ctrl.more())
        break;
      yield ch.put(i);
    }
    ch.close();
  });

  return ch;
};

var test = function(prime) {
  return function(i) {
    return i % prime != 0;
  };
};

var sieve = function*(n) {
  var ctrl = cc.chan();
  var ch = source(ctrl);
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
