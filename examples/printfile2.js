'use strict';

var fs = require('fs');
var cc = require('../index');


var content = function(path) {
  return cc.bind(fs.readFile, fs)(path, { encoding: 'utf8' });
};


var readLines = function(path) {
  var ch = cc.chan();

  cc.go(function*() {
    var lines = (yield content(path)).split('\n');

    for (var i = 0; i < lines.length; ++i)
      yield cc.push(ch, lines[i]);

    cc.close(ch);
  });

  return ch;
};


cc.go(function*() {
  var ch = readLines(process.argv[2]);
  var line, i;

  for (i = 1; (line = yield cc.pull(ch)) !== undefined; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + line);
});
