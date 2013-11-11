'use strict';

var cc = require('../core');
var cn = require('../node');
var cu = require('../util');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

cc.go(function* () {
  process.stdin.setEncoding('utf8');
  cu.each(console.log, cu.map(quote, cn.fromStream(process.stdin)));
});
