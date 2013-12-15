'use strict';

var cc = require('../index');

cc.go(function*() {
  yield cc.push(cc.chan());
});

