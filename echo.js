var csp = require('./csp')

var fromstream = function(stream, outch)
{
  stream.on('data', function(chunk) {
    csp.go(function* () {
      yield outch.put(chunk);
    });
  });

  stream.on('end', function() {
    outch.close();
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });
};

csp.go(function* () {
  var ch = csp.chan();

  process.stdin.setEncoding('utf8');
  fromstream(process.stdin, ch);

  while (ch.more()) {
    console.log((yield ch.take()) || "DONE");
  }
});
