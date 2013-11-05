'use strict'

var cc = require('../core');
var cu = require('../util');

var source = function(x) {
  var ch = cc.chan();
  cc.go(function*() {
    for (var i = 0; ; ++i) {
      yield cu.timeout(Math.random() * 100).pull();
      if (!(yield ch.push(i + x)))
        break;
    }
    ch.close();
  });

  return ch;
};

var makeChannels = function() {
  var chans = [];
  for (var i = 0; i < 3; ++i)
    chans.push(source(i / 10));
  return chans;
};

cc.go(function*() {
  var done = cu.each(console.log, cu.take(20, cu.zip(makeChannels())));
  yield done.pull();
  console.log();
  cu.each(console.log, cu.take(30, cu.merge(makeChannels())));
});
