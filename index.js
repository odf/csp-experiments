'use strict';

var extend = function(obj, other) {
  var p;
  for (p in other)
    obj[p] = other[p];
};

extend(exports, require('./core'));
extend(exports, require('./node'));
extend(exports, require('./filters'));
extend(exports, require('./buffers'));

exports.rawFilters = require('./raw_filters');
