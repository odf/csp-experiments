'use strict';

var cc = require('../index');

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

cc.go(function*() {
  var ch = cc.source(infiniteRange(1));
  var ticker = cc.ticker(500);

  for (var i = 0; i < 10; ++i) {
    yield cc.pull(ticker);
    console.log(yield cc.pull(ch));
  }
  ticker.close();
});
