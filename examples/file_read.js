var fs  = require('fs');
var csp = require('./csp');

var readFile = csp.bind(fs.readFile, fs);

csp.go(function* () {
  console.log(yield readFile(process.argv[2], { encoding: 'utf8' }));
})
