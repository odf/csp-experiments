'use strict';

var cc = require('./core');


exports.sleep = function(ms) {
  var t;

  var cancel = function(a) {
    clearTimeout(t);
  };

  return new cc.Action({
    run: function(a) {
      t = setTimeout(function() {
        cancel();
        a.resolve();
      }, ms);
    },

    cancel    : cancel,
    repeatable: true
  });
};


exports.select = function(actions) {
  var n = actions.length;
  var machines = [];

  var cancel = function(self) {
    for (var i = 0; i < n; ++i)
      actions[i].unsubscribe(machines[i]);
    machines = [];
  };

  var runner = function(target, source) {
    return function*() {
      try {
        var val = yield source;
        cancel();
        target.resolve(val);
      } catch (err) {
        cancel();
        target.reject(err);
      }
    };
  };

  return new cc.Action({
    run: function(self) {
      machines = actions.map(function(a) {
        return cc.go(runner(self, a));
      });
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


cc.go(function*() {
  var wait = exports.sleep(1000);

  yield wait;
  console.log(yield exports.succeed(1));
  yield wait;
  console.log(yield exports.succeed(2));
  yield wait;
  console.log(yield exports.select([
    exports.succeed(4),
    exports.succeed(3),
    exports.sleep(10000)
  ]));
});
