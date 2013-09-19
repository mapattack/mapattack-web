var ecstatic = require('ecstatic');
var flatiron = require('flatiron');
var app = flatiron.app;
var port = process.env.PORT;

app.use(flatiron.plugins.http, {
  before: [
    function (req, res) {
      var found = app.router.dispatch(req, res);
      if (!found) {
        res.emit('next');
      }
    },
    ecstatic({
      root: __dirname + '/app'
    })
  ],
  after: []
});

app.router.get('/v', function () {
  this.res.writeHead(200, { 'Content-Type': 'text/plain' });
  this.res.end('flatiron ' + flatiron.version);
});

app.start(port);
console.log('Flatiron started on port ' + port);