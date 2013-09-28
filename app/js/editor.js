/*global $:false, L:false */

(function(window,$,L,undefined){

  // let's capitalize!
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };

  // Ed is just a simple country editor singleton object literal
  var Ed = {
    $: {},              // dom cache
    request: null,      // make requests to the API
    Coin: null,         // coin class
    addCoin: null,      // add a coin to the map
    coins: null,        // array of all coins
    init: null,         // initialize the editor
    map: null,          // map instance
    triggers: null,     // feature group of drawn items
    drawControl: null,  // draw controls
    tools: {
      line: null,       // line tool
      point: null       // point tool
    }
  };

  // board tracker
  var board = {
    init: null,         // initialize board
    merge: null         // merge response into board
  };

  Ed.board = board;

  // user tracker
  var user = {
    id: null            // user id
  };

  Ed.user = user;

  // styles

  var lineStyle = {
    color: '#ffffff',
    opacity: 0.9,
    dashArray: '0.1, 30',
    weight: 15,
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

    var boardId = Ed.$.editor.data('board-id');
    board.id = boardId || null;

    if (board.id) {
      Ed.request('trigger/list', { tags: ['board:' + boardId] }, function(response){
        if (response.triggers.length !== 0) {
          board.merge(response.triggers[0]);

          Ed.request('trigger/list', { tags: ['coin:board:' + boardId] }, function(response){
            var triggers = response.triggers;
            var bounds = new L.LatLngBounds();

            for (var i = 0; i < triggers.length; i++) {
              var geo = triggers[i].condition.geo;
              var latLng = new L.LatLng(geo.latitude, geo.longitude);
              var value = triggers[i].properties.value;

              Ed.drawCoin(latLng, value, triggers[i].triggerId);
              Ed.drawTrigger(latLng, geo.distance, triggers[i].triggerId);
              bounds.extend(latLng);
            }

            if (bounds.isValid()) {
              Ed.map.fitBounds(bounds, {
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

  // user methods

  user.init = function() {
    user.id = Ed.$.user.data('id');
  };

  // Ed methods

  // make any Geotrigger API request
  Ed.request = function(method, params, callback){
    var post;

    if (typeof callback === 'undefined' &&
        typeof params === 'function') {
      callback = params;
    }

    if (typeof params === 'object') {
      post = $.post('/api/' + method, params, 'json');
    } else {
      post = $.post('/api/' + method, 'json');
    }

    post.done(callback);
  };

  // coin class
  Ed.Coin = L.Marker.extend({
    options: {
      draggable: true,
      triggerId: null
    }
  });

  Ed.CoinIcon = L.DivIcon.extend({
    options: {
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
      className:     'coin',
      popupAnchor:   [0, -10]
    }
  });

  Ed.Trigger = L.Circle.extend({
    options: {
      color: '#FF9843',
      opacity: 0.2,
      weight: 1,
      fill: true,
      fillOpacity: 0.1,
      triggerId: null
    }
  });

  Ed.createBoard = function(callback) {
    board.isNew = false;
    var bounds = Ed.triggers.getBounds();
    var polygon = L.polygon([bounds.getNorthWest(), bounds.getNorthEast(), bounds.getSouthEast(), bounds.getSouthWest(), bounds.getNorthWest()]);

    Ed.map.addLayer(polygon);

    console.log(polygon.toGeoJSON());

    Ed.request('trigger/create', {
      'setTags': ['board', 'board:' + board.id, 'board:twitter_id:' + user.id],
      'condition': {
        'direction': 'enter',
        'geo': {
          'geojson': polygon.toGeoJSON()
        }
      },
      'action': {
        'notification': {
          'text': 'You done entered a board!'
        }
      },
      'properties': {
        'title': Ed.$.title.val(),
        'city': Ed.$.city.val()
      }
    }, function(response){
      board.merge(response);

      if (window.history && window.history.replaceState) {
        window.history.pushState({}, '', '/boards/' + board.id + '/edit');
      }

      console.log('board created!');

      if (callback) {
        callback();
      }
    });
  };

  Ed.publishBoard = function(callback) {
    var bounds = Ed.triggers.getBounds();
    var polygon = L.polygon([bounds.getNorthWest(), bounds.getNorthEast(), bounds.getSouthEast(), bounds.getSouthWest(), bounds.getNorthWest()]);

    Ed.map.addLayer(polygon);

    Ed.request('trigger/update', {
      'tags': ['board:' + board.id],
      'condition': {
        'geo': {
          'geojson': polygon.toGeoJSON()
        }
      },
      'properties': {
        'title': Ed.$.title.val(),
        'city': Ed.$.city.val()
      }
    }, function(response){
      board.merge(response.triggers[0]);

      console.log('board published!');

      if (callback) {
        callback();
      }
    });
  };

  // add a new coin to the map
  Ed.addCoin = function(latLng, points){
    var distance = 30;

    var coin = Ed.drawCoin(latLng, points);

    Ed.createTrigger({
      latLng: latLng,
      points: points,
      success: function(response) {
        coin.options.triggerId = response.triggerId;
        if (board.isNew) {
          Ed.createBoard();
        }
      }
    });
  };

  Ed.createTrigger = function(options) {
    var latLng = options.latLng;
    var distance = options.distance || 30;
    var points = options.points || 10;

    Ed.request('trigger/create', {
      'setTags': ['coin', 'coin:board:' + board.id],
      'condition': {
        'direction': 'enter',
        'geo': {
          'latitude': latLng.lat,
          'longitude': latLng.lng,
          'distance': distance
        }
      },
      'action': {
        'notification': {
          'text': 'You done got ' + points + ' points!'
        }
      },
      'properties': {
        'value': points
      }
    }, function(response){
      Ed.drawTrigger(latLng, distance, response.triggerId);

      if (options.success) {
        options.success(response);
      }
    });
  };

  Ed.updateTrigger = function(options) {
    var triggerId = options.triggerId;
    var latLng = options.latLng;
    var distance = options.distance || 30;
    var points = options.points;

    var params = {};

    if (triggerId) {
      params.triggerIds = triggerId;
    }

    if (latLng) {
      params.condition = {};
      params.condition.geo = {
        'latitude': latLng.lat,
        'longitude': latLng.lng,
        'distance': distance
      };
    }

    if (points) {
      params.properties = {
        'value': points
      };
    }

    Ed.request('trigger/update', params, function(response){
      if (options.redraw !== false) {
        Ed.drawTrigger(latLng, distance, response.triggers[0].triggerId);
      }

      if (options.success) {
        options.success(response);
      }
    });
  };

  Ed.drawCoin = function(latLng, points, triggerId) {
    var msg = '<div class="coin-pop">';
    msg += '<button data-value="10" class="point-value ten"></button>';
    msg += '<button data-value="20" class="point-value twenty"></button>';
    msg += '<button data-value="30" class="point-value thirty"></button>';
    msg += '<button data-value="50" class="point-value fifty"></button>';
    msg += '<button class="delete-coin"></button>';
    msg += '</div>';

    var icon = new Ed.CoinIcon({
      className: 'coin p' + points
    });

    var coin = new Ed.Coin(latLng, {
      icon: icon,
      triggerId: triggerId
    });

    coin.on('dragstart', function(e){
      var target = e.target;
      var triggers = Ed.triggers.getLayers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].options.triggerId === target.options.triggerId) {
          Ed.triggers.removeLayer(triggers[i]);
        }
      }
    });

    coin.on('dragend', function(e){
      var target = e.target;
      var latLng = target.getLatLng();
      Ed.updateTrigger({
        triggerId: target.options.triggerId,
        latLng: latLng
      });
    });

    var popup = $(msg);

    // bind delete
    popup.find('.delete-coin').click(function(e){
      e.preventDefault();
      var triggerId = coin.options.triggerId;
      Ed.deleteTrigger(triggerId);
    });

    var $pts = popup.find('.point-value');

    // add active class to button with point value of coin
    $pts.filter(function(){
      return $(this).data('value') === Number(points);
    }).addClass('active');

    // bind point value switchery
    $pts.click(function(e){
      e.preventDefault();
      $pts.removeClass('active');
      var $this = $(this);
      var val = $this.data('value');
      var triggerId = coin.options.triggerId;

      Ed.updateTrigger({
        triggerId: triggerId,
        points: val,
        redraw: false,
        success: function(response){
          $this.addClass('active');
          console.log(coin.options.icon.options.className);
          $(coin._icon).removeClass('p50 p30 p20 p10');
          $(coin._icon).addClass('p' + val);

        }
      });

      coin.update({
        className: 'coin p' + val
      });

    });

    coin.addTo(Ed.coins).bindPopup(popup[0]);

    return coin;
  };

  Ed.drawTrigger = function(latLng, distance, triggerId){
    var trigger = new Ed.Trigger(latLng, distance, {
      triggerId: triggerId
    });

    trigger.addTo(Ed.triggers);
  };

  Ed.deleteTrigger = function(triggerId){
    Ed.request('trigger/delete', {
      triggerIds: triggerId
    }, function(response){
      var i;
      var triggers = Ed.triggers.getLayers();
      var coins = Ed.coins.getLayers();

      for (i = 0; i < triggers.length; i++) {
        if (triggers[i].options.triggerId === triggerId) {
          Ed.triggers.removeLayer(triggers[i]);
        }
      }

      for (i = 0; i < coins.length; i++) {
        if (coins[i].options.triggerId === triggerId) {
          Ed.coins.removeLayer(coins[i]);
        }
      }
    });
  };

  // convert points on a line to multiple coins
  Ed.parseLine = function(points){

    for (var i = 0; i < points.length - 1; i++){ // iterate over all of the points in the line
      var p1 = points[i];  // the first point on the line
      var p2 = points[i + 1]; // the second point on the line
      var corner = new L.LatLng(p1.lat, p2.lng); // a point due east or west of point1, and due north or south of point2
      var changeLng = Math.abs( Math.abs(p1.lng) - Math.abs(corner.lng) );
      var changeLat = Math.abs( Math.abs(p2.lat) - Math.abs(corner.lat) );

      var spacing = 60;
      var segmentLength = p1.distanceTo(p2);
      var coins = Math.floor(segmentLength / spacing);

      var lat = p1.lat;
      var lng = p1.lng;

      for (var j = 0; j < coins; j++) { // make all the coins

        var latLng = new L.LatLng(lat, lng);
        Ed.addCoin(latLng, 10);

        if (i === points.length - 2 && j === coins - 1){ //draw a coin if it's the very last point
          var lastPoint = points[points.length - 1];
          Ed.addCoin(lastPoint, 10);
        }

        if (p1.lng > p2.lng){ // increment longitude in the correct direction
          lng = lng - (changeLng / coins);
        } else {
          lng = lng + (changeLng / coins);
        }

        if (p1.lat > p2.lat){ //increment latitude in the correct direction
          lat = lat - (changeLat / coins);
        } else {
          lat = lat + (changeLat / coins);
        }

      }
    }
  };

  Ed.activatePoint = function () {
    if (Ed.$.point.hasClass('active')){
      Ed.$.point.removeClass('active');
      Ed.tools.point.disable();
    } else {
      Ed.$.point.addClass('active');
      Ed.$.line.removeClass('active');
      Ed.tools.line.disable();
      Ed.tools.point.enable();
    }
  };

  Ed.activateLine = function () {
    if (Ed.$.line.hasClass('active')){
      Ed.$.line.removeClass('active');
      Ed.tools.line.disable();
    } else {
      Ed.$.line.addClass('active');
      Ed.$.point.removeClass('active');
      Ed.tools.point.disable();
      Ed.tools.line.enable();
    }
  };

  // initialize the editor
  Ed.init = function(callback){

    Ed.$.editor = $('#editor');
    Ed.$.user = $('#user-data');
    Ed.$.tools = $('.edit-tools');
    Ed.$.line = Ed.$.tools.find('.btn.tool.line');
    Ed.$.point = Ed.$.tools.find('.btn.tool.point');
    Ed.$.publish = Ed.$.tools.find('.btn.publish');
    Ed.$.title = Ed.$.tools.find('input.title');
    Ed.$.city = Ed.$.tools.find('input.city');

    // init map
    // --------

    Ed.map = L.map('editor', {
      center: [45.50845, -122.64935],
      zoom: 16,
      scrollWheelZoom: true,
      attributionControl: false,
      zoomControl: false
    });

    new L.Control.Zoom({ position: 'bottomleft' }).addTo(Ed.map);

    L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
      maxZoom: 18,
      subdomains: '0123'
    }).addTo(Ed.map);

    // Ed.map.on('popupopen', function(e) {
    //   window.popup = this;
    // });

    // init draw
    // ---------

    Ed.coins = new L.FeatureGroup();
    Ed.triggers = new L.FeatureGroup();
    Ed.map.addLayer(Ed.coins);
    Ed.map.addLayer(Ed.triggers);

    Ed.tools.line = new L.Draw.Polyline(Ed.map, {
      shapeOptions: lineStyle
    });

    Ed.tools.point = new L.Draw.Marker(Ed.map, {
      icon: new Ed.CoinIcon(),
      repeatMode: true
    });

    Ed.$.line.click(function(e){
      e.preventDefault();
      Ed.activateLine();
    });

    Ed.$.point.click(function(e){
      e.preventDefault();
      Ed.activatePoint();
    });

    Ed.$.publish.click(function(e){
      e.preventDefault();
      if (board.triggerId) {
        Ed.publishBoard();
      } else {
        Ed.createBoard();
      }
    });

    Ed.map.on('draw:created', function(e) {
      var type = e.layerType;
      var layer = e.layer;

      if (type === 'marker') {
        Ed.addCoin(layer.getLatLng(), 10);
      } else {
        Ed.parseLine(layer.getLatLngs());
        Ed.activateLine();
      }
    });

    // init user

    user.init();

    // init board (async)

    board.init(callback);

  };

  // init editor when DOM is ready
  $(function(){
    Ed.init(function(){

      if (board.triggerId) {
        console.log('board exists!');
      } else {
        console.log('board is new!');
      }
    });

  });

  // expose Ed for debugs
  window.Ed = Ed;

})(window,$,L);
