'use strict';


var RingBuffer = exports.RingBuffer = function RingBuffer(size) {
  this.size = size;
  this.data_start = 0;
  this.data_count = 0;
  this.data = new Array(size);
};

RingBuffer.prototype.capacity = function() {
  return this.size;
};

RingBuffer.prototype.count = function() {
  return this.data_count;
};

RingBuffer.prototype.isEmpty = function() {
  return this.data_count == 0;
};

RingBuffer.prototype.isFull = function() {
  return this.data_count == this.size;
};

RingBuffer.prototype.write = function(val) {
  var pos = (this.data_start + this.data_count) % this.size;
  this.data[pos] = val;
  if (this.data_count < this.size)
    this.data_count += 1;
  else
    this.data_start = (this.data_start + 1) % this.size;
};

RingBuffer.prototype.read = function() {
  var val = this.data[this.data_start];
  this.data_start = (this.data_start + 1) % this.size;
  this.data_count = Math.max(this.data_count - 1, 0);
  return val;
};

RingBuffer.prototype.resize = function(n) {
  var new_data = new Array(n);
  for (var i = 0; i < this.data_count; ++i)
    new_data[i % n] = this.data[(this.data_start + i) % this.size];
  this.size = n;
  this.data_start = 0;
  this.data_count = Math.min(this.data_count, this.size);
  this.data = new_data;
};


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
