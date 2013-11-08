'use strict'

var cc = require('../core');
var cu = require('../util');

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

  done = cu.each(console.log, cu.take(30, cu.merge(makeChannels())));
  yield done.pull();

  console.log();

  done = cu.each(console.log, cu.take(20, cu.combine(makeChannels())));
  yield done.pull();

  console.log();

  done = cu.each(console.log, cu.take(20, cu.zip(makeChannels())));
  yield done.pull();
});
