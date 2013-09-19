var ecstatic = require('ecstatic');
var flatiron = require('flatiron');
var connect = require('connect');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;

var app = flatiron.app;
var port = process.env.PORT;
var TWITTER_CONSUMER_KEY = 'IIGRnG9P1T0MnQwUBcIGw';
var TWITTER_CONSUMER_SECRET = 'jnX0iSykVAICNevOMs8oBPzwbPnj2MYsUc8ciPgsg0';

passport.serializeUser(function(user, done) {
  console.log('serialize');
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log('deserialize');
  done(null, obj);
});

passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: 'http://mapattack.dev:3000/auth/twitter/callback'
  },
  function(token, tokenSecret, profile, done) {
    console.log('strategy');
    // asynchronous verification, for effect...
    process.nextTick(function () {
      console.log('strategy tick');
      return done(null, profile);
    });
  }
));

app.use(flatiron.plugins.http, {
  before: [
    connect.cookieParser('secret'),
    connect.session(),
    passport.initialize(),
    passport.session(),
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

app.router.get('/auth/twitter', passport.authenticate('twitter'), function(){});

app.router.get('/auth/twitter/callback', passport.authenticate('twitter', {
  failureRedirect: '/login'
}), function() {
  this.res.writeHead(302, {
    'Location': 'login.html'
  });
  this.res.end();
});

app.router.get(/logout/, function() {
  //  req.logout();
  this.res.writeHead(302, {
    'Location': '/'
  });
  this.res.end();
});
app.start(port);
console.log('Flatiron started on port ' + port);