'use strict';

var cu = require('../util');

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

var inch = cu.source(infiniteRange(1));

var preds = [
  function(n) { return n % 15 == 0 },
  function(n) { return n % 3 == 0 },
  function(n) { return n % 5 == 0 },
  true];

var intermediates = cu.scatter(preds, inch);

var fizzbuzz = cu.map(function() { return "fizzbuzz"; }, intermediates[0]);
var fizz     = cu.map(function() { return "fizz"; }, intermediates[1]);
var buzz     = cu.map(function() { return "buzz"; }, intermediates[2]);
var rest     = intermediates[3];

var outch = cu.merge([fizzbuzz, fizz, buzz, rest]);

var n = parseInt(process.argv[2] || "50");

cu.each(console.log, cu.take(n, outch));
