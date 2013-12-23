'use strict';

var cc = require('./core');
var cb = require('./buffers');


function Channel(buffer) {
  this.buffer   = buffer;
  this.pending  = [];
  this.pressure = 0;
  this.isClosed = false;
};

Channel.prototype.push = function(val) {
  if (this.pressure < 0) {
    var client = this.pending.shift();
    if (this.buffer.push(val))
      client.resolve(this.buffer.pull()[0]);
    else
      client.resolve(val);
    ++this.pressure;
    return true;
  } else
    return this.buffer.push(val);
};

Channel.prototype.requestPush = function(val, client) {
  if (val === undefined)
    client.reject(new Error("push() requires an argument"));
  else if (this.isClosed)
    client.resolve(false);
  else if (this.push(val))
    client.resolve(true);
  else {
    this.pending.push([client, val]);
    ++this.pressure;
  }
};

Channel.prototype.cancelPush = function(val, client) {
  var i = this.pending.indexOf([client, val]);
  if (i >= 0) {
    this.pending.splice(i, 1);
    --this.pressure;
  }
};

Channel.prototype.pull = function() {
  if (this.pressure > 0) {
    var next   = this.pending.shift();
    var client = next[0];
    var val    = next[1];
    var pulled = this.buffer.pull();
    if (pulled.length > 0) {
      this.buffer.push(val);
      val = pulled[0];
    }
    client.resolve(true);
    --this.pressure;
    return [val];
  } else
    return this.buffer.pull();
};

Channel.prototype.requestPull = function(client) {
  var res = this.pull();
  if (res.length > 0)
    client.resolve(res[0]);
  else if (this.isClosed)
    client.resolve();
  else {
    this.pending.push(client);
    --this.pressure;
  }
};

Channel.prototype.cancelPull = function(client) {
  var i = this.pending.indexOf(client);
  if (i >= 0) {
    this.pending.splice(i, 1);
    ++this.pressure;
  }
};


Channel.prototype.close = function() {
  while (this.pressure < 0)
    this.push();
  this.isClosed = true;
};


exports.chan = function(arg) {
  var buffer = (typeof arg == "object") ? arg : new cb.Buffer(arg || 0);
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


exports.select = function() {
  var args = Array.prototype.slice.call(arguments);
  var result = cc.deferred();
  var active = [];

  var cancel = function() {
    active.forEach(function(op) {
      if (op.value === undefined)
        op.channel.cancelPull(op.client);
      else
        op.channel.cancelPush(op.client, op.value);
    });
  };

  for (var i = 0; i < args.length; ++i) {
    if (result.isResolved())
      break;
    var next = {
      resolve: function(i, val) {
        cancel();
        result.resolve({ index: i, value: val });
      }.bind(null, i),
      reject:  function(err) {
        cancel();
        result.reject(new Error(err));
      }
    };
    var ch = args[i];
    var val;
    if (!!(ch) && ch.constructor == Channel) {
      active.push({ client: next, channel: ch });
      ch.requestPull(next);
    } else {
      val = ch[1];
      ch = ch[0];
      active.push({ client: next, channel: ch, value: val });
      ch.requestPush(next, val);
    }
  }

  return result;
};
