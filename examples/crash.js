'use strict';

var cc = require('../index');

var ch = cc.chan();
cc.go(function*() { yield cc.push(ch); });
