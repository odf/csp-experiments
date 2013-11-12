'use strict';

exports.nullBuffer = {
  pushCanFail: function() { return false; },
  tryToPush  : function() { return true; },
  tryToPull  : function() { return []; }
};


var Unbuffer = exports.Unbuffer = function Unbuffer() {
  this.pullPending = false;
  this.hasValue = false;
  this.value = null;
};

Unbuffer.prototype.pushCanFail = function() {
  return true;
};

Unbuffer.prototype.tryToPush = function(val) {
  if (this.pullPending) {
    this.pullPending = false;
    this.hasValue = true;
    this.value = val;
    return true;
  } else {
    return false;
  }
};

Unbuffer.prototype.tryToPull = function() {
  if (this.hasValue) {
    this.pullPending = false;
    this.hasValue = false;
    return [this.value];
  } else {
    this.pullPending = true;
    return [];
  }
};


var Buffer = exports.Buffer = function Buffer(size) {
  this.size = size || 1;
  this.contents = [];
};

Buffer.prototype.pushCanFail = function() {
  return true;
};

Buffer.prototype.tryToPush = function(val) {
  if (this.contents.length < this.size) {
    this.contents.unshift(val);
    return true;
  } else {
    return false;
  }
};

Buffer.prototype.tryToPull = function() {
  if (this.contents.length > 0)
    return [this.contents.pop()];
  else
    return [];
};


var DroppingBuffer = exports.DroppingBuffer = function DroppingBuffer(size) {
  this.size = size || 1;
  this.contents = [];
};

DroppingBuffer.prototype.pushCanFail = function() {
  return false;
};

DroppingBuffer.prototype.tryToPush = function(val) {
  if (this.contents.length < this.size)
    this.contents.unshift(val);
  return true;
};

DroppingBuffer.prototype.tryToPull = function() {
  if (this.contents.length > 0)
    return [this.contents.pop()];
  else
    return [];
};


var SlidingBuffer = exports.SlidingBuffer = function SlidingBuffer(size) {
  this.size = size || 1;
  this.contents = [];
};

SlidingBuffer.prototype.pushCanFail = function() {
  return false;
};

SlidingBuffer.prototype.tryToPush = function(val) {
  while (this.contents.length >= this.size)
    this.contents.pop();
    
  this.contents.unshift(val);
  return true;
};

SlidingBuffer.prototype.tryToPull = function() {
  if (this.contents.length > 0)
    return [this.contents.pop()];
  else
    return [];
};

