'use strict';

var cc = require('../core');

var ch = cc.chan();
cc.go(function*() { yield ch.push(); });
