var fs   = require('fs');
var csp  = require('../src/csp');
var cspn = require('../src/node');

csp.go(function* () {
  var path = process.argv[2];
  var options = { encoding: 'utf8' };

  console.log(yield cspn.call(fs.readFile, fs, path, options));

  var read = cspn.bind(fs.readFile, fs);

  console.log(yield read(path, options));
})
