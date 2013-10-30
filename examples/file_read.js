var fs = require('fs');
var cc = require('../core');
var cn = require('../node');

cc.go(function* () {
  var path = process.argv[2];
  var options = { encoding: 'utf8' };

  console.log(yield cn.call(fs.readFile, fs, path, options));
})
