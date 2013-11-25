'use strict';

var cc = require('../index');

var source = function(x) {
  var ch = cc.chan();
  cc.go(function*() {
    for (var i = 0; ; ++i) {
      yield cc.pass(Math.random() * 100);
      if (!(yield cc.push(ch, "" + x + "." + i)))
        break;
    }
    cc.close(ch);
  });

  return ch;
};

var makeChannels = function() {
  var chans = [];
  for (var i of 'abc'.split('').values())
    chans.push(source(i));
  return chans;
};

cc.go(function*() {
  var done;

  done = cc.each(console.log, cc.take(30, cc.merge(makeChannels())));
  yield cc.pull(done);

  console.log();

  done = cc.each(console.log, cc.take(20, cc.combine(makeChannels())));
  yield cc.pull(done);

  console.log();

  done = cc.each(console.log, cc.take(20, cc.zip(makeChannels())));
  yield cc.pull(done);
});
