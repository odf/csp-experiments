'use strict';

var cc = require('./core');
var cb = require('./buffers');


function Channel(buffer) {
  this.buffer   = buffer;
  this.pending  = [];
  this.data     = [];
  this.pressure = 0;
  this.isClosed = false;
};

Channel.prototype.pushBuffer = function(val) {
  return this.buffer ? this.buffer.push(val) : false;
};

Channel.prototype.pullBuffer = function() {
  if (this.buffer)
    return this.buffer.pull()[0];
};

Channel.prototype.push = function(val) {
  if (this.pressure < 0) {
    var client = this.pending.shift();
    client.resolve(this.pushBuffer(val) ? this.pullBuffer() : val);
    ++this.pressure;
    return true;
  } else
    return this.pushBuffer(val);
};

Channel.prototype.requestPush = function(val, client) {
  if (val === undefined)
    client.reject(new Error("push() requires an argument"));
  else if (this.isClosed)
    client.resolve(false);
  else if (this.push(val))
    client.resolve(true);
  else {
    this.pending.push(client);
    this.data.push(val);
    ++this.pressure;
  }
};

Channel.prototype.pull = function() {
  if (this.pressure > 0) {
    var client = this.pending.shift();
    var val    = this.data.shift();
    var pulled = this.pullBuffer();
    if (pulled !== undefined) {
      this.pushBuffer(val);
      val = pulled;
    }
    client.resolve(true);
    --this.pressure;
    return val;
  } else
    return this.pullBuffer();
};

Channel.prototype.requestPull = function(client) {
  var res = this.pull();
  if (res !== undefined)
    client.resolve(res);
  else if (this.isClosed)
    client.resolve();
  else {
    this.pending.push(client);
    --this.pressure;
  }
};

Channel.prototype.cancelRequest = function(client) {
  for (var i = 0; i < this.pending.length; ++i) {
    if (this.pending[i] === client) {
      this.pending.splice(i, 1);
      if (this.pressure > 0) {
        this.data.splice(i, 1);
        --this.pressure;
      } else
        ++this.pressure;
      break;
    }
  }
};

Channel.prototype.close = function() {
  while (this.pressure < 0)
    this.push();
  this.isClosed = true;
};


exports.chan = function(arg) {
  var buffer;
  if (typeof arg == "object")
    buffer = arg;
  else if (arg)
    buffer = new cb.Buffer(arg);
  return new Channel(buffer);
};

exports.push = function(ch, val) {
  var a = cc.deferred();
  ch.requestPush(val, a);
  return a;
};

exports.pull = function(ch) {
  var a = cc.deferred();
  ch.requestPull(a);
  return a;
};

exports.close = function(ch) {
  ch.close();
};


exports.timeout = function(ms) {
  var ch = exports.chan();
  var t = setTimeout(function() {
    clearTimeout(t);
    exports.close(ch);
  }, ms);
  return ch;
};


var cancelOperation = function(op) {
  var channel = op[0];
  var machine = op[1];

  channel.cancelRequest(machine);
};

var makeClient = function(i, result, cancel) {
  return {
    resolve: function(val) {
      cancel();
      result.resolve({ index: i, value: val });
    },
    reject: function(err) {
      cancel();
      result.reject(new Error(err));
    }
  };
};

exports.select = function() {
  var args   = Array.prototype.slice.call(arguments);
  var result = cc.deferred();
  var active = [];
  var cancel = function() { active.forEach(); };

  var client, isPush, channel, value;

  for (var i = 0; i < args.length; ++i) {
    client = makeClient(i, result, cancel);
    isPush = Array.isArray(args[i]);

    if (isPush) {
      channel = args[i][0];
      value   = args[i][1];
    }
    else
      channel = args[i];

    active.push([channel, client]);

    if (isPush)
      channel.requestPush(client, value);
    else
      channel.requestPull(client);

    if (result.isResolved())
      break;
  }

  return result;
};
