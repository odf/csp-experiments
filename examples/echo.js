var cc = require('../core');
var cn = require('../node');
var cu = require('../util');

cc.go(function* () {
  process.stdin.setEncoding('utf8');
  cu.each(console.log, cn.fromStream(process.stdin));
});
