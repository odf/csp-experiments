'use strict';

function DroppingBuffer(size) {
  this.size = size || 1;
  this.contents = [];
};

DroppingBuffer.prototype.canFail = function() {
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


function SlidingBuffer(size) {
  this.size = size || 1;
  this.contents = [];
};

SlidingBuffer.prototype.canFail = function() {
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


module.exports = {
  DroppingBuffer: DroppingBuffer,
  SlidingBuffer: SlidingBuffer
};
