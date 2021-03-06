'use strict';

var extend = function(obj, other) {
  var p;
  for (p in other)
    obj[p] = other[p];
};

extend(exports, require('./src/core'));
extend(exports, require('./src/channels'));
extend(exports, require('./src/buffers'));
extend(exports, require('./src/node'));
extend(exports, require('./src/filters'));

exports.rawFilters = require('./src/raw_filters');
