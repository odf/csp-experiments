'use strict';

var cc = require('../index');

var source = function(x) {
  var ch = cc.chan();
  cc.go(function*() {
    for (var i = 0; ; ++i) {
      yield cc.pass(Math.random() * 100);
      if (!(yield ch.push("" + x + "." + i)))
        break;
    }
    ch.close();
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
  yield done.pull();

  console.log();

  done = cc.each(console.log, cc.take(20, cc.combine(makeChannels())));
  yield done.pull();

  console.log();

  done = cc.each(console.log, cc.take(20, cc.zip(makeChannels())));
  yield done.pull();
});
