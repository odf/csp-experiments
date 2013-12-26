'use strict';

var RingBuffer = require('./RingBuffer');


var Buffer = exports.Buffer = function Buffer(size) {
  this.buffer = new RingBuffer(size);
};

Buffer.prototype.canBlock = function() {
  return true;
};

Buffer.prototype.push = function(val) {
  if (this.buffer.isFull())
    return false;
  else {
    this.buffer.write(val);
    return true;
  }
};

Buffer.prototype.pull = function() {
  if (this.buffer.isEmpty())
    return [];
  else
    return [this.buffer.read()];
};


var DroppingBuffer = exports.DroppingBuffer = function DroppingBuffer(size) {
  this.buffer = new RingBuffer(size);
};

DroppingBuffer.prototype.canBlock = function() {
  return false;
};

DroppingBuffer.prototype.push = function(val) {
  if (!this.buffer.isFull())
    this.buffer.write(val);
  return true;
};

DroppingBuffer.prototype.pull = Buffer.prototype.pull;


var SlidingBuffer = exports.SlidingBuffer = function SlidingBuffer(size) {
  this.buffer = new RingBuffer(size);
};

SlidingBuffer.prototype.canBlock = function() {
  return false;
};

SlidingBuffer.prototype.push = function(val) {
  this.buffer.write(val);
  return true;
};

SlidingBuffer.prototype.pull = Buffer.prototype.pull;
