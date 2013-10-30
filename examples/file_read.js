var fs   = require('fs');
var csp  = require('../csp');
var cspn = require('../node');

csp.go(function* () {
  var path = process.argv[2];
  var options = { encoding: 'utf8' };

  console.log(yield cspn.call(fs.readFile, fs, path, options));
})
