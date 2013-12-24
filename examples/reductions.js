'use strict';

var cc = require('../index');

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

var plus = function(a, b) { return a + b; };
var times = function(a, b) { return a * b; };

cc.go(function*() {
  console.log("Integers:");
  yield cc.chain(cc.source(infiniteRange(1)),
                 [cc.take, 10],
                 [cc.each, console.log],
                 cc.pull);

  console.log();
  console.log("Triangle numbers:");
  yield cc.chain(cc.source(infiniteRange(1)),
                 [cc.reductions, plus],
                 [cc.take, 10],
                 [cc.each, console.log],
                 cc.pull);

  console.log();
  console.log("Tetrahedral numbers:");
  yield cc.chain(cc.source(infiniteRange(1)),
                 [cc.reductions, plus],
                 [cc.reductions, plus],
                 [cc.take, 10],
                 [cc.each, console.log],
                 cc.pull);

  console.log();
  console.log("Factorials:");
  yield cc.chain(cc.source(infiniteRange(1)),
                 [cc.reductions, times],
                 [cc.take, 10],
                 [cc.each, console.log],
                 cc.pull);
});
