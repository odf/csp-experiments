'use strict';

var cc = require('../index');

var run = function(buffer) {
  var ch = cc.chan(buffer);

  cc.go(function*() {
    for (var i = 1; ; ++i) {
      if (!(yield cc.push(ch, i)))
        break;
      if (i % 10 == 0)
        yield cc.pass();
    }
    cc.close(ch);
  });

  return cc.pull(cc.each(console.log, cc.take(20, ch)));
};

cc.go(function*() {
  yield run(new cc.Buffer(5));
  console.log();
  yield run(new cc.DroppingBuffer(5));
  console.log();
  run(new cc.SlidingBuffer(5));
});
