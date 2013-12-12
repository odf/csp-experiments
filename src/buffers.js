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

DroppingBuffer.prototype.pull = function() {
  if (this.buffer.isEmpty())
    return [];
  else
    return [this.buffer.read()];
};


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

SlidingBuffer.prototype.pull = function() {
  if (this.buffer.isEmpty())
    return [];
  else
    return [this.buffer.read()];
};


var Unbuffer = exports.Unbuffer = function Unbuffer() {
  this.pullPending = false;
  this.hasValue = false;
  this.value = null;
};

Unbuffer.prototype.canBlock = function() {
  return true;
};

Unbuffer.prototype.push = function(val) {
  if (this.pullPending) {
    this.pullPending = false;
    this.hasValue = true;
    this.value = val;
    return true;
  } else {
    return false;
  }
};

Unbuffer.prototype.pull = function() {
  if (this.hasValue) {
    this.pullPending = false;
    this.hasValue = false;
    return [this.value];
  } else {
    this.pullPending = true;
    return [];
  }
};


exports.nullBuffer = {
  canBlock: function() { return false; },
  push    : function() { return true; },
  pull    : function() { return []; }
};
