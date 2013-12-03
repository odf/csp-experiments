'use strict';

var cc = require('../index');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

var chain = function(arg) {
  var val = arg;
  Array.prototype.slice.call(arguments, 1).forEach(function(form) {
    val = form[0].apply(null, form.slice(1).concat([val]));
  });
  return val;
};

cc.go(function* () {
  process.stdin.setEncoding('utf8');
  //cc.each(console.log, cc.map(quote, cc.fromStream(process.stdin)));

  chain(process.stdin,
        [cc.fromStream],
        [cc.map, quote],
        [cc.each, console.log]);
});
