'use strict';

var cc = require('../core');
var cu = require('../util');
var cb = require('../buffers');

var run = function(buffer) {
  var ch = cc.chan(buffer);

  cc.go(function*() {
    for (var i = 1; ; ++i) {
      if (!(yield ch.push(i)))
        break;
      if (i % 10 == 0)
        yield cc.pass();
    }
    ch.close();
  });

  return cu.each(console.log, cu.take(60, ch)).pull();
};

cc.go(function*() {
  yield run(new cb.DroppingBuffer(5));
  console.log();
  run(new cb.SlidingBuffer(5));
});
