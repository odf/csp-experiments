'use strict';

var cc = require('../index');

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

var inch = cc.source(infiniteRange(1));

var preds = [
  function(n) { return n % 15 == 0 },
  function(n) { return n % 3 == 0 },
  function(n) { return n % 5 == 0 },
  true];

var intermediates = cc.scatter(preds, inch);

var fizzbuzz = cc.map(function() { return "fizzbuzz"; }, intermediates[0]);
var fizz     = cc.map(function() { return "fizz"; }, intermediates[1]);
var buzz     = cc.map(function() { return "buzz"; }, intermediates[2]);
var rest     = intermediates[3];

var outch = cc.merge([fizzbuzz, fizz, buzz, rest]);

var n = parseInt(process.argv[2] || "50");

cc.each(console.log, cc.take(n, outch));
