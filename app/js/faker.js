/*global $:false, L:false */

(function(window,$,L,undefined){

  // THE FAKER
  // ---------

  // register a device
  // get an access token for that device
  // join a game
  // post a bunch of location updates

  var Faker = {
    $: {},              // dom cache
    init: null,         // initialize the editor
    map: null,          // map instance
    request: null,      // make requests to the API
    Coin: null,         // coin class
    coins: null,        // coins feature group
    triggers: null,     // triggers feature group
    sendLocation: null, // send fake player's fake location, fakely
    tools: {
      line: null        // line tool
    }
  };

  // board tracker
  var board = {
    init: null,         // initialize board
    merge: null         // merge response into board
  };

  Faker.board = board;

  // player tracker
  var player = {
    id: null            // player id
  };

  Faker.player = player;

  // styles

  var lineStyle = {
    color: '#ffffff',
    opacity: 0.9,
    dashArray: '0.1, 5',
    weight: 3,
    fill: false,
    fillOpacity: 0
  };

  // board methods

  board.merge = function(obj){
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        board[key] = obj[key];
      }
    }
  };

  board.init = function(callback){

    var boardId = Faker.$.editor.data('board-id');
    board.id = boardId || null;

    if (board.id) {
      Faker.request('trigger/list', { tags: ['board:' + boardId] }, function(response){
        if (response.triggers.length !== 0) {
          board.merge(response.triggers[0]);

          Faker.request('trigger/list', { tags: ['coin:board:' + boardId] }, function(response){
            var triggers = response.triggers;
            var bounds = new L.LatLngBounds();

            for (var i = 0; i < triggers.length; i++) {
              var geo = triggers[i].condition.geo;
              var latLng = new L.LatLng(geo.latitude, geo.longitude);
              var value = triggers[i].properties.value;

              Faker.drawCoin(latLng, value, triggers[i].triggerId);
              Faker.drawTrigger(latLng, geo.distance, triggers[i].triggerId);
              bounds.extend(latLng);
            }

            if (bounds.isValid()) {
              Faker.map.fitBounds(bounds, {
                padding: [50, 50]
              });
            }

            callback();
          });
        } else {
          board.isNew = true;
          callback();
        }
      });
    } else {
      throw new Error('Missing Board ID!');
    }
  };

  // player methods

  player.init = function() {
    // device id?
  };

  // Faker methods

  // make any Geotrigger API request
  Faker.request = function(method, params, callback){
    var options = {
      type: 'POST',
      url: '/trigger-api/' + method,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    };

    if (typeof callback === 'undefined' &&
        typeof params === 'function') {
      callback = params;
    }

    if (typeof params === 'object') {
      options.data = JSON.stringify(params);
    }

    $.ajax(options)
      .done(callback)
      .fail(function(jqXHR, textStatus, errorThrown){
        console.log('API call failed', jqXHR, textStatus, errorThrown);
      });
  };

  Faker.api = function(method, params, callback){
    var options = {
      type: 'POST',
      url: '/attack-api/' + method,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    };

    if (typeof callback === 'undefined' &&
        typeof params === 'function') {
      callback = params;
    }

    if (typeof params === 'object') {
      options.data = JSON.stringify(params);
    }

    $.ajax(options)
      .done(callback)
      .fail(function(jqXHR, textStatus, errorThrown){
        console.log('API call failed', jqXHR, textStatus, errorThrown);
      });
  };

  Faker.Coin = L.Marker.extend({
    options: {
      draggable: false,
      triggerId: null
    }
  });

  Faker.CoinIcon = L.DivIcon.extend({
    options: {
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
      className:     'coin',
      popupAnchor:   [0, -10]
    }
  });

  Faker.Trigger = L.Circle.extend({
    options: {
      color: '#FF9843',
      opacity: 0.2,
      weight: 1,
      fill: true,
      fillOpacity: 0.1,
      triggerId: null,
      clickable: false
    }
  });

  Faker.Board = L.Polygon.extend({
    options: {
      color: '#2EBF30',
      weight: 2,
      opacity: 0.2,
      fill: true,
      fillOpacity: 0,
      triggerId: null,
      clickable: false
    }
  });

  Faker.Step = L.Marker.extend({
    options: {
      draggable: true,
      triggerId: null
    }
  });

  Faker.StepIcon = L.DivIcon.extend({
    options: {
      iconSize:      [2, 2],
      iconAnchor:    [1, 1],
      className:     'step'
    }
  });

  Faker.drawBoard = function(){
    Faker.extra.clearLayers();

    if (board.condition.geo.geojson) {
      var shape = L.geoJson(board.condition.geo.geojson);
      shape.setStyle({
        color: '#2EBF30',
        weight: 2,
        opacity: 0.2,
        fill: true,
        fillOpacity: 0,
        triggerId: null,
        clickable: false
      });
      shape.addTo(Faker.extra);
    }
  };

  Faker.drawCoin = function(latLng, points, triggerId) {
    var icon = new Faker.CoinIcon({
      className: 'coin p' + points
    });

    var coin = new Faker.Coin(latLng, {
      icon: icon,
      triggerId: triggerId
    });

    coin.addTo(Faker.coins);

    return coin;
  };

  Faker.drawTrigger = function(latLng, distance, triggerId){
    var trigger = new Faker.Trigger(latLng, distance, {
      triggerId: triggerId
    });

    trigger.addTo(Faker.triggers);
  };

  // convert points on a line to multiple coins
  Faker.parseLine = function(points){

    for (var i = 0; i < points.length - 1; i++){ // iterate over all of the points in the line
      var p1 = points[i];  // the first point on the line
      var p2 = points[i + 1]; // the second point on the line
      var corner = new L.LatLng(p1.lat, p2.lng); // a point due east or west of point1, and due north or south of point2
      var changeLng = Math.abs( Math.abs(p1.lng) - Math.abs(corner.lng) );
      var changeLat = Math.abs( Math.abs(p2.lat) - Math.abs(corner.lat) );

      // space between location updates in meters
      var spacing = 5;
      // time between location updates in milliseconds
      var interval = 500;

      var segmentLength = p1.distanceTo(p2);
      var steps = Math.floor(segmentLength / spacing);

      var lat = p1.lat;
      var lng = p1.lng;

      console.log(steps);

      function nextStep() {
        var latLng = new L.LatLng(lat, lng);
        Faker.sendLocation(latLng);

        if (i === points.length - 2 && j === steps - 1){ //draw a coin if it's the very last point
          var lastPoint = points[points.length - 1];
          Faker.sendLocation(lastPoint);
        }

        if (p1.lng > p2.lng){ // increment longitude in the correct direction
          lng = lng - (changeLng / steps);
        } else {
          lng = lng + (changeLng / steps);
        }

        if (p1.lat > p2.lat){ //increment latitude in the correct direction
          lat = lat - (changeLat / steps);
        } else {
          lat = lat + (changeLat / steps);
        }

        j++;

        if (j < steps) {
          setTimeout(nextStep, interval);
        }
      }

      var j = 0;

      nextStep();
    }
  };

  Faker.sendLocation = function(latLng){
    console.log(latLng);
    var params = {
      access_token: Faker.access_token,
      latitude: latLng.lat,
      longitude: latLng.lng,
      timestamp: Math.floor(+new Date() / 1000),
      speed: 1,
      bearing: 180,
      accuracy: 5
    };

    var options = {
      type: 'POST',
      url: '/faker/' + board.id + '/update',
      data: JSON.stringify(params),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    };

    $.ajax(options);

    var icon = new Faker.StepIcon({
      className: 'step ' + Faker.team
    });

    var step = new Faker.Step(latLng, {
      icon: icon
    });

    step.addTo(Faker.extra);
  };

  Faker.toggleStepTool = function(){
    if (Faker.$.line.hasClass('active')){
      Faker.$.line.removeClass('active');
      Faker.tools.line.disable();
    } else {
      Faker.$.line.addClass('active');
      Faker.tools.line.enable();
    }
  };

  Faker.checkGameState = function(){
    Faker.api('board/state', {
      access_token: Faker.access_token,
      board_id: board.id
    }, function(response){
      if (response.board && response.board.game_id) {
        Faker.game_id = response.board.game_id;
        Faker.$.join.removeAttr('disabled').text('Join Game');
      } else {
        Faker.$.join.text('No Game. Try Again!');
      }
    });
  };

  // initialize the editor
  Faker.init = function(callback){

    Faker.$.editor = $('#editor');
    Faker.$.tools = $('.edit-tools');
    Faker.$.line = Faker.$.tools.find('.btn.tool.line');
    Faker.$.register = Faker.$.tools.find('.register-device');
    Faker.$.join = Faker.$.tools.find('.join-game');

    // init map
    // --------

    Faker.map = L.map('editor', {
      center: [45.522706,-122.669327],
      zoom: 12,
      scrollWheelZoom: true,
      attributionControl: false,
      zoomControl: false
    });

    new L.Control.Zoom({ position: 'bottomleft' }).addTo(Faker.map);

    L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
      maxZoom: 18,
      subdomains: '0123'
    }).addTo(Faker.map);

    // register

    Faker.$.register.click(function(e){
      e.preventDefault();
      Faker.$.register.prop('disabled', true).text('registering device...');

      Faker.api('device/register', function(response){
        Faker.device_id = response.device_id;
        Faker.access_token = response.access_token;

        if (window.history && window.history.pushState) {
          window.history.pushState({}, '', '/faker/' + board.id + '?access_token=' + Faker.access_token);
        }

        Faker.$.register.text('√ device registered');
        Faker.checkGameState();
      });
    });

    // join

    Faker.$.join.click(function(e){
      e.preventDefault();
      Faker.$.join.prop('disabled', true).text('joining game...');

      Faker.api('game/join', {
        access_token: Faker.access_token,
        game_id: Faker.game_id
      }, function(response){
        Faker.team = response.team;
        Faker.$.join.text('√ game joined');
        Faker.$.line.removeAttr('disabled');
      });
    });

    // init draw
    // ---------

    Faker.coins = new L.FeatureGroup();
    Faker.triggers = new L.FeatureGroup();
    Faker.extra = new L.FeatureGroup();

    Faker.map.addLayer(Faker.coins);
    Faker.map.addLayer(Faker.triggers);
    Faker.map.addLayer(Faker.extra);

    Faker.tools.line = new L.Draw.Polyline(Faker.map, {
      shapeOptions: lineStyle
    });

    Faker.$.line.click(function(e){
      e.preventDefault();
      Faker.toggleStepTool();
    });

    Faker.map.on('draw:created', function(e) {
      Faker.toggleStepTool();
      Faker.parseLine(e.layer.getLatLngs());
    });

    // init player

    player.init();

    // init board (async)

    board.init(callback);

  };

  // init editor when DOM is ready
  $(function(){
    Faker.init(function(){
      Faker.drawBoard();

      // check for token
      var match = window.location.search.match(/access_token=([^&]+)/);

      if (match) {
        Faker.access_token = match[1];
        Faker.$.register.prop('disabled', true).text('√ device registered');
        Faker.$.join.text('checking game state...');
        Faker.checkGameState();
      }
    });
  });

  // expose Faker for debugs
  window.Faker = Faker;

})(window,$,L);
