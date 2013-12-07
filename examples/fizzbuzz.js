'use strict';

var cc = require('../index');

var infiniteRange = function*(start) {
  for (var i = start; ; i += 1)
    yield i;
};

var preds = [
  function(n) { return n % 15 == 0 },
  function(n) { return n % 3 == 0 },
  function(n) { return n % 5 == 0 },
  true];

var intermediates = cc.scatter(preds, cc.source(infiniteRange(1)));

var fizzbuzz = cc.map(function() { return "fizzbuzz"; }, intermediates[0]);
var fizz     = cc.map(function() { return "fizz"; }, intermediates[1]);
var buzz     = cc.map(function() { return "buzz"; }, intermediates[2]);
var rest     = intermediates[3];

var n = parseInt(process.argv[2] || "25");

cc.chain(cc.merge([fizzbuzz, fizz, buzz, rest]),
         [cc.takeWhileOpen, cc.timeout(n)],
         [cc.each, console.log]);
