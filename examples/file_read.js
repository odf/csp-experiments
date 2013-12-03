'use strict';

var fs = require('fs');
var cc = require('../index');

var readFile = cc.bind(fs.readFile, fs);

cc.go(function* () {
  console.log(yield readFile(process.argv[2], { encoding: 'utf8' }));
});
