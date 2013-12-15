'use strict';

var cc = require('./core');
var cb = require('./buffers');


function Channel(buffer) {
  this.buffer = buffer;
  this.pushers = [];
  this.values  = [];
  this.pullers = [];
  this.isClosed = false;
};

Channel.prototype.requestPush = function(val, client) {
  if (val === undefined)
    client.reject(new Error("push() requires an argument"));
  else if (this.isClosed)
    client.resolve(false);
  else if (this.buffer.push(val))
    client.resolve(true);
  else {
    this.pushers.push(client);
    this.values.push(val);
  }

  this.tryNextPull();
};

Channel.prototype.tryNextPush = function() {
  if (this.pushers.length > 0 && this.buffer.push(this.values[0])) {
    this.pushers.shift().resolve(true);
    this.values.shift();
    this.tryNextPull();
  }
};

Channel.prototype.cancelPush = function(client) {
  var i = this.pushers.indexOf(client);
  if (i >= 0) {
    this.pushers.splice(i, 1);
    this.values.splice(i, 1);
  }
};

Channel.prototype.requestPull = function(client) {
  var res = this.buffer.pull();
  if (res.length > 0)
    client.resolve(res[0]);
  else if (this.isClosed)
    client.resolve();
  else
    this.pullers.push(client);

  this.tryNextPush();
};

Channel.prototype.tryNextPull = function() {
  if (this.pullers.length > 0) {
    var res = this.buffer.pull();
    if (res.length > 0) {
      this.pullers.shift().resolve(res[0]);
      this.tryNextPush();
    }
  }
};

Channel.prototype.cancelPull = function(client) {
  var i = this.pullers.indexOf(client);
  if (i >= 0)
    this.pullers.splice(i, 1);
};

Channel.prototype.close = function() {
  while (this.pullers.length > 0)
    this.pullers.shift().resolve();
  while (this.pushers.length > 0)
    this.pushers.shift().resolve(false);
};


exports.chan = function(arg) {
  var buffer;

  if (arg == undefined)
    buffer = new cb.Unbuffer();
  else if (typeof arg == "object")
    buffer = arg
  else if (arg === 0)
    buffer = cb.nullBuffer;
  else
    buffer = new cb.Buffer(arg || 1);

  return new Channel(buffer);
};

exports.push = function(ch, val) {
  return new cc.Action({
    run: function(self) {
      ch.requestPush(val, self);
    },
    cancel: function(self) {
      ch.cancelPush(self);
    },
    repeatable: true
  });
};

exports.pull = function(ch) {
  return new cc.Action({
    run: function(self) {
      ch.requestPull(self);
    },
    cancel: function(self) {
      ch.cancelPull(self);
    },
    repeatable: true
  });
};

exports.close = function(ch) {
  ch.close();
};
