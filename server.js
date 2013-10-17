// declare ye vars
// ---------------

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

// globals to store boards and games and share between routes and methods and such
var boards = [];
var games = [];

// misc
var needle = require('needle');
var hour = 3600000;

// udp
var client = require('dgram').createSocket('udp4');

// config superchain
// -----------------

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
      .use(express.errorHandler({ dumpExceptions: true, showStack: true }))
      .use(express.static(__dirname + '/app'));
  })
  .configure('production', function(){
    app
      .use(express.logger())
      .use(express.errorHandler())
      .use(express.static(__dirname + '/public'));
  })
  .use(partials())
  .use(app.router);

// twitter auth
// ------------

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

// helper functions
// ----------------

// drop-in functions for routes, mostly self-explanatory

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.redirectUrl = req.url;
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

function getGames(req, res, next) {
  needle.get(config.mapattack.api+'/game/list', function(error, response, body){
    if (!error && response.statusCode == 200 && body.games) {
      games = body.games;
      res.locals({
        games: games
      });
    } else {
      res.locals({
        games: []
      });
      console.log("Couldn't retrieve game list", error.type, error.message);
    }
    next();
  });
}

// util

function getNewBoardId(callback) {
  needle.post(config.mapattack.api+'/board/new', {
    access_token: api.token
  }, function(error, response, body) {
    if (!error && response.statusCode == 200 && body.board_id) {
      callback(body.board_id);
    } else {
      callback(false);
    }
  });
}

function findBoardById(id) {
  return boards.filter(function(obj){
    return findIdInTags(obj.tags, 'board') === id;
  })[0];
}

function findGameById(id) {
  return games.filter(function(obj){
    return obj.game && obj.game.game_id === id;
  })[0];
}

function findIdInTags(input_tags, prefix) {
  // Given a list of tags like "board","board:10","game","game:20","game:21" and a prefix "board", return "10"
  var result = null;
  input_tags.forEach(function(t){
    var match = t.match(new RegExp('^'+prefix+':([^:]+)$'));
    if (match) {
      result = match[1];
    }
  });
  return result;
}

// add as view helper
app.locals.findIdInTags = findIdInTags;

// routes
// ------

// things to load for every route

app.get('/boards*', ensureAuthenticated, loadAuthentication, getBoards);
app.get('/faker*', loadAuthentication, getBoards);
app.get('/games*', loadAuthentication, getGames);
app.get('/home', ensureAuthenticated, loadAuthentication, getBoards, getGames);
app.get('/iphone', loadAuthentication);
app.get('/android', loadAuthentication);
app.get('/', loadAuthentication);

// root
// ----

// render home if user is logged in, otherwise render index
app.get('/', function(req, res){
  if (req.user) {
    res.redirect('/home');
  } else {
    res.render('index', { layout: false });
  }
});

app.get('/home', function(req, res){
  res.render('home');
});

app.get('/iphone', function(req, res){
  res.render('iphone');
});

app.get('/android', function(req, res){
  res.render('android');
});

// In-Game Info Web View
app.get('/info', function(req, res){
  res.render('info', { layout: false });
});

// authentication
// --------------

// twitter auth endpoint
// sends user to twitter API to authenticate
app.get('/login', passport.authenticate('twitter'));

// twitter auth callback endpoint
// where twitter sends the user once auth step is done
// redirects to `/` if auth fails, else `/`
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/' }),
  function(req, res) {
    if (req.session.redirectUrl) {
      var redirectUrl = req.session.redirectUrl;
      req.session.redirectUrl = null;
      res.redirect(redirectUrl);
    } else {
      res.redirect('/home');
    }
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
  res.render('all-boards');
});

// new board
app.get('/boards/new', function(req, res){
  getNewBoardId(function(boardId){
    res.locals.boardId = boardId;
    res.render('editor', { layout: false });
  });
});

// show existing board
app.get('/boards/:id', function(req, res){
  var board = findBoardById(req.params.id);
  if (board) {
    res.locals.board = board;
    res.render('board', { layout: false });
  } else {
    res.send('Board not found');
  }
});

// edit existing board
app.get('/boards/:id/edit', function(req, res){
  var board = findBoardById(req.params.id);
  if (board) {
    res.locals.board = board;
    res.render('editor', { layout: false });
  } else {
    res.send('Board not found');
  }
});

// delete board and all associated coins
app.get('/boards/:id/delete', function(req, res){
  api.request('trigger/delete', {
    tags: ['coin:board:' + req.params.id, 'board:' + req.params.id]
  }, function(error, response){
    res.json(error || response);
  });
});

// avatar
// ------

app.get('/map-avatar/:img.png', function(req, res){
  console.log("Image: "+req.params.img);
  // pass-thru to PHP script cause it was way easier to do it in PHP
  needle.get('http://pin13.net/mapattack/images/'+req.params.img+'.png', function(err, response, body){
    res.writeHead(200, {'Content-Type': 'image/png'});
    res.end(body, 'binary');
  });
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

// viewer routes
// -------------

app.get('/games/:id', function(req, res){
  needle.post(config.mapattack.api+'/game/state', {
    game_id: req.params.id
  }, function(error, response, body) {
    if (!error && response.statusCode === 200 && body) {
      res.locals.state = body;
      res.render('viewer', { layout: false });
    } else {
      res.json({ 'error': error });
    }
  });

});

// API routes
// ----------

// passes posts to `/trigger-api/:method_name` to geotriggers.js, e.g. `trigger/list`
app.post('/trigger-api/*', function(req, res){
  api.request(req.params[0], req.body, function(error, response){
    res.json(error || response);
  });
});

// passes posts to `/attack-api/:method_name` to mapattack api
app.post('/attack-api/*', function(req, res){
  needle.post(config.mapattack.api+'/' + req.params[0], req.body, function(error, response, body) {
    res.json(error || body);
  });
});

// Fake routes
// -----------

app.get('/faker/:id', function(req, res){
  var board = findBoardById(req.params.id);
  res.locals.board = board;
  res.render('faker', { layout: false });
});

app.post('/faker/:id/update', function(req, res){
  var message = JSON.stringify(req.body);

  client.send(new Buffer(message), 0, message.length, 5309, config.mapattack.udp_host, function(err, bytes) {
    // forgotten
  });

  var arr = ['^_^','(゜o゜)','(^_^)/','(^O^)／','(^o^)／','(^^)/','(≧∇≦)/','(^o^)丿','∩( ・ω・)∩','( ・ω・)','^ω^'];
  res.send(arr[Math.floor(Math.random() * arr.length)]);
});

// start the server
// ----------------

// choo choo
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
