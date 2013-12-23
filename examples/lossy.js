'use strict';

var cc = require('../index');

var run = function(buffer) {
  var ch = cc.chan(buffer);

  cc.go(function*() {
    for (var i = 1; ; ++i) {
      if (!(yield cc.push(ch, i)))
        break;
      if (i % 10 == 0)
        yield null;
    }
    cc.close(ch);
  });

  return cc.chain(ch,
                  [cc.take, 20],
                  [cc.each, console.log],
                  cc.pull);
};

cc.go(function*() {
  yield run(new cc.Buffer(0));
  console.log();
  yield run(new cc.Buffer(5));
  console.log();
  yield run(new cc.DroppingBuffer(5));
  console.log();
  run(new cc.SlidingBuffer(5));
});
