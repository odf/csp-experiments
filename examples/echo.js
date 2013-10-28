var csp = require('../src/csp')

var fromStream = function(stream)
{
  var ch = csp.chan();

  stream.on('data', function(chunk) {
    csp.go(function*() {
      yield ch.put(chunk);
    });
  });

  stream.on('end', function() {
    ch.close();
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return ch;
};

csp.go(function* () {
  var ch;

  process.stdin.setEncoding('utf8');
  ch = fromStream(process.stdin);

  while (ch.more()) {
    console.log((yield ch.take()) || "DONE");
  }
});
