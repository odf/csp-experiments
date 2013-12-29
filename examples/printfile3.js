'use strict';

var fs = require('fs');
var cc = require('../index');


var content = function(path) {
  return cc.bind(fs.readFile, fs)(path, { encoding: 'utf8' });
};


var readLines = function(path) {
  return cc.go(function*() {
    var lines = (yield content(path)).split('\n');
    var ch = cc.chan();

    lines.forEach(function(line) {
      cc.go(function*() { yield cc.push(ch, line); });
    });

    cc.go(function*() { cc.close(ch); });

    return ch;
  });
};


cc.go(function*() {
  var ch = yield readLines(process.argv[2]);
  var line, i;

  for (i = 1; (line = yield cc.pull(ch)) !== undefined; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + line);
});
