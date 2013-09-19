var ecstatic = require('ecstatic');
var flatiron = require('flatiron');
var app = flatiron.app;

app.use(flatiron.plugins.http, {
  //
  // List of middleware to use before dispatching
  // to app.router
  //
  before: [
    ecstatic({ root: __dirname + '/app' })
  ],
  after: []
});

//
// app.router is now available. app[HTTP-VERB] is also available
// as a shortcut for creating routes
//
app.router.get('/version', function () {
  this.res.writeHead(200, { 'Content-Type': 'text/plain' });
  this.res.end('flatiron ' + flatiron.version);
});

app.start(process.env.PORT);
console.log('Flatiron started on port ' + process.env.PORT);
