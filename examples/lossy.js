'use strict';

var cc = require('../core');
var cu = require('../util');
var cb = require('../buffers');

var ch = cc.chan(new cb.DroppingBuffer(5));
cc.go(function*() {
  for (var i = 1; ; ++i) {
    if (!(yield ch.push(i)))
      break;
  }
  ch.close();
});

cu.each(console.log, cu.take(60, ch));
