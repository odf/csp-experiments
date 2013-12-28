'use strict';


const PENDING  = 0;
const RESOLVED = 1;
const REJECTED = 2;


function Deferred() {
  this.client = null;
  this.state  = PENDING;
  this.value  = undefined;
};

Deferred.prototype.isResolved = function() {
  return this.state != PENDING;
};

Deferred.prototype.resolve = function(val) {
  this.update(RESOLVED, val);
};

Deferred.prototype.reject = function(cause) {
  this.update(REJECTED, cause);
};

Deferred.prototype.publish = function() {
  if (this.client) {
    if (this.state == RESOLVED)
      this.client.resolve(this.value);
    else if (this.state == REJECTED)
      this.client.reject(this.value);
  }
};

Deferred.prototype.subscribe = function(machine) {
  if (this.client != null)
    machine.reject(new Error('a deferred can only have one client'));
  else {
    this.client = machine;
    this.publish();
  }
}

Deferred.prototype.update = function(state, val) {
  if (this.isResolved())
    throw new Error('deferred is already resolved');

  this.state = state;
  this.value = val;
  this.publish();
};


exports.deferred = function() {
  return new Deferred();
};
