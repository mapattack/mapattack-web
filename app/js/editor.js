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
    init: null          // initialize board
  };

  // styles

  var lineStyle = {
    color: '#ffffff',
    opacity: 0.9,
    dashArray: '0.1, 30',
    weight: 15,
    fill: false,
    fillOpacity: 0
  };

  board.init = function(callback){
    var boardId = Ed.$.editor.data('board-id');

    Ed.request('trigger/list', { tags: ['trigger:' + boardId] }, function(response){
      var self = response.triggers[0];
      for (var key in self) {
        if (self.hasOwnProperty(key)) {
          board[key] = self[key];
        }
      }
      callback();
    });
  };

  // make any Geotrigger API request
  Ed.request = function(method, params, callback){
    var post;

    if (typeof callback === 'undefined' &&
        typeof params === 'function') {
      callback = params;
    }

    if (typeof params === 'object') {
      post = $.post('/api/' + method, params);
    } else {
      post = $.post('/api/' + method);
    }

    post.done(callback);
  };

  // coin class
  Ed.Coin = L.Marker.extend({
    options: {
      triggerId: null
    }
  });

  Ed.CoinIcon = L.Icon.extend({
    options: {
      iconUrl:       '/img/coin10.png',
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
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

  // add a new coin to the map
  Ed.addCoin = function(latLng, pts, color){
    var path = '/img/coin';
    var msg;
    if (color) {
      path += color;
      msg = color.capitalize() + ' team got ' + pts + ' points';
    } else {
      msg = 'Worth ' + pts + ' points.';
    }
    path += pts + '.png';

    var triggerId = 'magic';
    var icon = new Ed.CoinIcon({iconUrl: path});
    var coin = new Ed.Coin(latLng, {
      icon: icon,
      triggerId: triggerId
    });
    var trigger = new Ed.Trigger(latLng, 30, {
      triggerId: triggerId
    });

    // Ed.request('trigger/create', {}, function(response){
    //   // marker.triggerId = response.something;
    //   marker.addTo(Ed.coins).bindPopup(msg);
    // });

    // use for creating the trigger
    trigger.addTo(Ed.triggers);
    coin.addTo(Ed.coins).bindPopup(msg);
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
    if (Ed.$.point[0].classList.contains('active')){
      Ed.$.point[0].className = 'btn tool point';
      Ed.tools.point.disable();
    } else {
      Ed.$.point[0].className = 'btn tool point active';
      Ed.$.line[0].className = 'btn tool line';
      Ed.tools.point.enable();
    }
  };

  Ed.pointListen = function() {
    if (Ed.$.point[0].classList.contains('active')){
      console.log('ping');
      Ed.tools.point.enable();
    }
  };

  Ed.activateLine = function () {
    if (Ed.$.line[0].classList.contains('active')){
      Ed.$.line[0].className = 'btn tool line';
      Ed.tools.line.disable();
    } else {
      Ed.$.line[0].className = 'btn tool line active';
      Ed.$.point[0].className = 'btn tool point';
      Ed.tools.point.disable();
      Ed.tools.line.enable();
    }
  };

  // initialize the editor
  Ed.init = function(callback){

    Ed.$.editor = $('#editor');
    Ed.$.tools = $('.edit-tools .btn.tool');
    Ed.$.line = Ed.$.tools.filter('.line');
    Ed.$.point = Ed.$.tools.filter('.point');

    // init map
    // --------

    Ed.map = L.map('editor').setView([45.50845, -122.64935], 16);

    L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
      maxZoom: 18,
      subdomains: '0123'
    }).addTo(Ed.map);

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

    Ed.map.on('draw:created', function(e) {
      var type = e.layerType;
      var layer = e.layer;
      Ed.pointListen();

      if (type === 'marker') {
        Ed.addCoin(layer.getLatLng(), 10);
        Ed.activatePoint();
      } else {
        Ed.parseLine(layer.getLatLngs());
        Ed.activateLine();
      }
    });

    // init board

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
    // add coins
    // ---------

    // add pretend coins

    // Ed.addCoin([45.50845, -122.64935], 10);
    // Ed.addCoin([45.50845, -122.64835], 20);
    // Ed.addCoin([45.50845, -122.64735], 30);
    // Ed.addCoin([45.50845, -122.64635], 40);
    // Ed.addCoin([45.50845, -122.64535], 50);

    // Ed.addCoin([45.50745, -122.64935], 10, 'red');
    // Ed.addCoin([45.50745, -122.64835], 20, 'red');
    // Ed.addCoin([45.50745, -122.64735], 30, 'red');
    // Ed.addCoin([45.50745, -122.64635], 40, 'red');
    // Ed.addCoin([45.50745, -122.64535], 50, 'red');

    // Ed.addCoin([45.50945, -122.64935], 10, 'blue');
    // Ed.addCoin([45.50945, -122.64835], 20, 'blue');
    // Ed.addCoin([45.50945, -122.64735], 30, 'blue');
    // Ed.addCoin([45.50945, -122.64635], 40, 'blue');
    // Ed.addCoin([45.50945, -122.64535], 50, 'blue');

    // Ed.request('trigger/list', { tags: ['coin', 'coin:board:' + board.id] }, function(response){
    //   console.log('You\'ve got ' + response.triggers.length + ' coins!');
    //   console.log(response);
    // });

  });

  // expose Ed for debugs
  window.Ed = Ed;

})(window,$,L);

