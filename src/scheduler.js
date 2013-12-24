'use strict';

require('setimmediate');

var RingBuffer = require('./RingBuffer');


module.exports = function(size) {
  var queue = new RingBuffer(size || 100);
  var scheduleFlush = true;

  var flush = function() {
    scheduleFlush = true;
    for (var i = queue.count(); i > 0; --i)
      queue.read()();
  };

  return function(thunk) {
    if (queue.isFull())
      queue.resize(Math.floor(queue.capacity() * 1.5));
    queue.write(thunk);
    if (scheduleFlush) {
      setImmediate(flush);
      scheduleFlush = false;
    }
  };
};
