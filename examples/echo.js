'use strict';

var cc = require('../index');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

process.stdin.setEncoding('utf8');

cc.chain(cc.fromStream(process.stdin),
         [cc.map, quote],
         [cc.each, console.log]);
