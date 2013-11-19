'use strict';

var cc = require('../index');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

cc.go(function* () {
  process.stdin.setEncoding('utf8');
  cc.each(console.log, cc.map(quote, cc.fromStream(process.stdin)));
});
