'use strict';

require('setimmediate');

var queue = [];

var flush = function() {
  var todo = queue.slice();
  queue = [];
  while (todo.length > 0)
    todo.shift()();
};

module.exports = function(fn) {
  queue.push(fn);
  if (queue.length == 1)
    setImmediate(flush);
};
