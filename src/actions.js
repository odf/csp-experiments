'use strict';

var cc = require('./core');


exports.pass = function(ms) {
  var t;
  var result = cc.unresolved;

  t = setTimeout(function() {
    clearTimeout(t);
    result = cc.resolved();
  }, ms);

  return function() {
    return result;
  };
};


exports.select = function(actions) {
  return function() {
    for (var i = 0; i < actions.length; ++i) {
      var res = actions[i]();
      if (cc.isResolved(res))
        return cc.resolved({ index: i, value: cc.getValue(res) });
    }
    return cc.unresolved;
  }
};


exports.constant = function(val) {
  var result = cc.resolved(val);

  return function() {
    return result;
  };
};
