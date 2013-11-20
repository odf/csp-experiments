'use strict';

var cc = require('./core');


function Deferred() {
  this.result = cc.unresolved;
};

Deferred.prototype.resolve = function(val) {
  this.result = cc.resolved(val);
};

Deferred.prototype.reject = function(val) {
  this.result = cc.rejected(val);
};

Deferred.prototype.errand = function() {
  return function() { return this.result; }.bind(this);
};


var apply = exports.apply = function(fn, context, args) {
  var deferred = new Deferred();

  var callback = function(err, val) {
    if (err)
      deferred.reject(new Error(err));
    else
      deferred.resolve(val);
  };
  fn.apply(context, args.concat(callback));

  return deferred.errand();
};


var call = exports.call = function(fn, context) {
  var args = Array.prototype.slice.call(arguments, 2);
  return apply(fn, context, args);
};

exports.bind = function(fn, context)
{
  return call.bind(null, fn, context);
};

exports.fromStream = function(stream, outch, keepOpen)
{
  var ch = outch || cc.chan();

  stream.on('data', function(chunk) {
    cc.go(function*() {
      yield ch.push(chunk);
    });
  });

  stream.on('end', function() {
    if (!keepOpen)
      ch.close();
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};
