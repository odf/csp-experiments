var csp = require('./csp')

fromstream = function(stream, outch, statch)
{
  stream.on('data', function(chunk) {
    csp.go(function* () {
      yield outch.put(chunk);
    });
  });

  stream.on('end', function() {
    if (statch) {
      csp.go(function* () {
        yield statch.put({ status: 'end' });
      });
    }
  });

  stream.on('error', function(err) {
    if (statch) {
      csp.go(function* () {
        yield statch.put({ status: 'error', value: new Error(err) });
      });
    } else {
      throw new Error(err);
    }
  });
}

csp.go(function* () {
  var inch = csp.chan();
  var statch = csp.chan();

  process.stdin.setEncoding('utf8');
  fromstream(process.stdin, inch, statch);

  while (true) {
    var res = yield csp.select([inch, statch]);
    var out = res.value;

    if (res.channel == statch)
    {
      if (out.status == 'error')
        throw out.value;
      else if (out.status == 'end')
        break;
    } else {
      console.log(out);
    }
  }
});
