'use strict';

var cc = require('./core');


exports.sleep = function(ms) {
  var result = new cc.Action();
  var t = setTimeout(function() {
    clearTimeout(t);
    result.resolve();
  }, ms);
  return result;
};


exports.select = function(actions) {
  var n = actions.length;
  var machines = [];

  var cancel = function(self) {
    for (var i = 0; i < n; ++i)
      actions[i].unsubscribe(machines[i]);
    machines = [];
  };

  var runner = function(target, index) {
    return function*() {
      try {
        var val = yield actions[index];
        cancel();
        target.resolve({ index: index, value: val });
      } catch (err) {
        cancel();
        target.reject(err);
      }
    };
  };

  return new cc.Action({
    run: function(self) {
      for (var i = 0; i < n; ++i)
        machines.push(cc.go(runner(self, i)));
    },
    cancel    : cancel,
    repeatable: true
  });
};


exports.succeed = function(val) {
  var result = new cc.Action();
  result.resolve(val);
  return result;
};


exports.fail = function(val) {
  var result = new cc.Action();
  result.reject(new Error(val));
  return result;
};
