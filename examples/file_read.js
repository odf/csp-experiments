'use strict';

var fs = require('fs');
var cc = require('../index');

cc.go(function* () {
  var path = process.argv[2];
  var options = { encoding: 'utf8' };

  console.log(yield cc.call(fs.readFile, fs, path, options));
});
