'use strict';

var cc = require('../index');

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

var ms = parseInt(process.argv[2] || "10");
var ch = cc.source(infiniteRange(1));

cc.go(function*() {
  console.log('Taking the first 10 numbers:');

  yield cc.chain(ch,
                 [cc.take, 10, { keepInput: true }],
                 [cc.each, console.log],
                 cc.pull);

  console.log();
  console.log('Taking further numbers for ' + ms + ' miliseconds:');

  yield cc.chain(ch,
                 [cc.takeWithTimeout, ms, { keepInput: true }],
                 [cc.each, console.log],
                 cc.pull);

  console.log();
  console.log('Taking 10 more numbers:');

  yield cc.chain(ch,
                 [cc.take, 10, { keepInput: true }],
                 [cc.each, console.log],
                 cc.pull);
});
