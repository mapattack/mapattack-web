var pkg = require('./package.json');
var config = require('./config.json');

// server dependencies
var express = require('express');
var app = express();
var partials = require('express-partials');
var port = process.env.PORT || 3000;

// passport dependencies
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;

// geotriggers!
var Geotriggers = require('./lib/geotriggers');

var api = new Geotriggers.Session({
  clientId: config.ago.client_id,
  clientSecret: config.ago.client_secret
});

// global to store boards and share between routes and methods and such
var boards = {};

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
    consumerKey: config.twitter.consumer_key,
    consumerSecret: config.twitter.consumer_secret,
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

// drop-in functions for routes, mostly self-explanatory

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  console.log('y\'all ain\'t authenticatered');
  res.redirect('/');
}

function loadAuthentication(req, res, next) {
  res.locals({
    user: req.user ? req.user : null,
    authenticated: req.isAuthenticated()
  });
  next();
}

function getBoards(req, res, next) {
  api.request('trigger/list', { tags: 'board' }, function(error, response){
    if (error) {
      console.log(error);
    } else {
      boards = response.triggers;
    }
    res.locals({
      boards: boards
    });
    next();
  });
}

// util

function findBoardById(id) {
  return boards.filter(function(obj){
    return obj.triggerId === id;
  })[0];
}

// routes
// ------

// things to load for every route

// app.get('/boards*', ensureAuthenticated, loadAuthentication, getBoards);
// app.get('/', loadAuthentication, getBoards);
// just do it up for debug for now for the win
app.get('*', loadAuthentication, getBoards);

// root
// ----

// render home if user is logged in, otherwise render index
app.get('/', function(req, res){
  res.render('home');

  // if (req.user) {
  //   res.render('home');
  // } else {
  //   res.render('index');
  // }
});

// authentication
// --------------

// twitter auth endpoint
// sends user to twitter API to authenticate
app.get('/auth/twitter', passport.authenticate('twitter'));

// twitter auth callback endpoint
// where twitter sends the user once auth step is done
// redirects to `/` if auth fails, else `/`
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/' }),
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

// board routes
// ------------

// reference
// ---------
// The board is represented as a large polygon trigger.

// Tags:

// board - indicates that this trigger is a board, used to search for "board" triggers
// board:XXXXXX - specifies the board_id of this trigger
// board:username:XXXXXX - the Twitter username of the person who created the board, for access control
// game:XXXXXX - when a game is started from a board, this specifies the game_id of the active game

// list all boards
app.get('/boards', function(req, res){
  res.json(res.locals.boards);
});

// new board
app.get('/boards/new', function(req, res){
  res.render('editor', { layout: false });
});

app.post('/boards/new', function(req, res){
  // create new board
});

// show existing board
app.get('/boards/:id', function(req, res){
  var board = findBoardById(req.params.id);
  res.json(board);
});

// edit existing board
app.get('/boards/:id/edit', function(req, res){
  res.locals.board = findBoardById(req.params.id);
  res.render('editor', { layout: false });
});

app.post('/boards/:id/edit', function(req, res){
  // update existing board
});

// coin routes
// -----------

// reference
// ---------
// Coin Triggers

// Each coin is a point+distance trigger.

// Tags:

// coin - indicates that this trigger is a coin
// coin:board:XXXXXX - the board_id this coin belongs to
// coin:game:XXXXXX - the game_id this coin belongs to (activates this trigger for the game)
// Properties:

// value: 10 (10, 20, 50)
// team: red (red, blue, [none])

// get all coins for a board?
app.get('/board/:id/coins', function(req, res){
  // ?
});

app.get('/games/:id', function(req, res){
  var board = findBoardById(req.params.id);
  res.json(board);
});

// Geotrigger API route
// --------------------
// passes posts to `/api/:method_name` to geotriggers.js, e.g. `trigger/list`
app.post('/api/*', function(req, res){
  api.request(req.params[0], req.body, function(error, response){
    res.json(error || response);
  });
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
