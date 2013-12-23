'use strict';

var cc = require('../index');

var source = function(x) {
  var ch = cc.chan();
  cc.go(function*() {
    for (var i = 0; ; ++i) {
      yield cc.pull(cc.timeout(Math.random() * 100));
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
  yield cc.chain(cc.merge(makeChannels()),
                 [cc.take, 30],
                 [cc.each, console.log],
                 cc.pull);

  console.log();

  yield cc.chain(cc.combine(makeChannels()),
                 [cc.take, 20],
                 [cc.each, console.log],
                 cc.pull);

  console.log();

  yield cc.chain(cc.zip(makeChannels()),
                 [cc.take, 20],
                 [cc.each, console.log],
                 cc.pull);
});
