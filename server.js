var pkg = require('./package.json');

// server dependencies
var express = require('express');
var app = express();
var partials = require('express-partials');
var port = process.env.PORT || 3000;

// passport dependencies
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var TWITTER_CONSUMER_KEY = 'VSCJzgLBienoPOs45tgYRQ';
var TWITTER_CONSUMER_SECRET = 'CnMscq17Btt8cMuOTm7NQd72DYDoo676YUxm7L3fA';

// misc
var hour = 3600000;

// server config superchain

app
  .set('port', port)
  .set('views', __dirname + '/views')
  .set('view engine', 'ejs')
  .use(express.favicon(__dirname + '/app/favicon.ico'))
  .use(express.bodyParser())
  .use(express.methodOverride())
  .use(express.cookieParser('loqisaur'))
  .use(express.session({ secret: '#unicorner' }))
  .use(passport.initialize())
  .use(passport.session())
  .configure('development', function(){
    app
      .use(express.logger('dev'))
      .use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  })
  .configure('production', function(){
    app
      .use(express.logger())
      .use(express.errorHandler());
  })
  .use(express.static(__dirname + '/app'))
  .use(partials())
  .use(app.router);

// twitter auth

// serialize the user into the database (noop)
passport.serializeUser(function(user, done) {
  done(null, user);
});

// deserialize the user into the database (noop)
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// passport twitter setup
passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: '/auth/twitter/callback'
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
      // The user's Twitter profile is returned to represent the logged-in user.
      // Profile is made available at `req.user`.
      return done(null, profile);
    });
  }
));

// drop-in function to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.render('/fail');
}

// routes

// root
// render home if user is logged in, otherwise render index
app.get('/', function(req, res){
  if (req.user) {
    res.render('home', { user: req.user });
  } else {
    res.render('index');
  }
});

// twitter auth endpoint
// sends user to twitter API to authenticate
app.get('/auth/twitter', passport.authenticate('twitter'));

// twitter auth callback endpoint
// where twitter sends the user once auth step is done
// redirects to `/fail` if auth fails, else `/`
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/fail' }),
  function(req, res) {
    res.redirect('/');
  }
);

// logout
// clears the session
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// start server
app.listen(app.get('port'), function(){
  var started = [
    pkg.name,
    pkg.version,
    'serving at',
    'http://localhost:' + app.get('port'),
    'in',
    app.settings.env,
    'mode'
  ];
  console.log(started.join(' '));
});
