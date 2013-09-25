/*global $:false, L:false */

(function(window,$,L,undefined){

  // let's capitalize!!!!!!!!
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };

  // Ed is just a simple country editor singleton object literal
  var Ed = {
    $: {},              // dom cache
    request: null,      // make requests to the API
    Coin: null,         // coin class
    addCoin: null,      // add a coin to the map
    coins: [],          // array of all coins
    init: null,         // initialize the editor
    map: null,          // map instance
    drawnItems: null,   // feature group of drawn items
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

  board.init = function(){

    var boardId = Ed.$.editor.data('board-id');

    board.id = boardId ? boardId : null;
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
  Ed.Coin = L.Icon.extend({
    options: {
      iconUrl:       '/img/coin10.png',
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
      popupAnchor:   [0, -10]
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

    var coin = new Ed.Coin({iconUrl: path});

    var marker = L.marker(latLng, {icon: coin});

    marker.addTo(Ed.map).bindPopup(msg);

    Ed.coins.push(marker);

    return marker;
  };

  // initialize the editor
  Ed.init = function(){

    Ed.$.editor = $('#editor');
    Ed.$.tools = $('.edit-tools .btn.tool');
    Ed.$.line = Ed.$.tools.filter('.line');
    Ed.$.point = Ed.$.tools.filter('.point');

    // init map
    // --------

    Ed.map = L.map('editor').setView([45.50845, -122.64935], 16);

    L.esri.basemapLayer('Streets').addTo(Ed.map);

    // not ready yet
    // L.tileLayer('http://mapattack-tiles-0.pdx.esri.com/dark/{z}/{y}/{x}', {
    //   maxZoom: 18
    // }).addTo(Ed.map);

    // init draw
    // ---------

    Ed.drawnItems = new L.FeatureGroup();
    Ed.map.addLayer(Ed.drawnItems);

    Ed.tools.line = new L.Draw.Polyline(Ed.map);
    Ed.tools.point = new L.Draw.Marker(Ed.map, {
      icon: new Ed.Coin()
    });

    Ed.$.line.click(function(e){
      e.preventDefault();
      Ed.tools.line.enable();
    });

    Ed.$.point.click(function(e){
      e.preventDefault();
      Ed.tools.point.enable();
    });

    Ed.map.on('draw:created', function (e) {
      var type = e.layerType,
        layer = e.layer;

      if (type === 'marker') {
        // point
      } else {
        // line
      }

      Ed.drawnItems.addLayer(layer);
    });

    // init board

    board.init();

  };

  // init editor when DOM is ready
  $(function(){
    Ed.init();

    // add coins
    // ---------

    if (board.id) {
      // add pretend coins
      Ed.addCoin([45.50845, -122.64935], 10);
      Ed.addCoin([45.50845, -122.64835], 20);
      Ed.addCoin([45.50845, -122.64735], 30);
      Ed.addCoin([45.50845, -122.64635], 40);
      Ed.addCoin([45.50845, -122.64535], 50);

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
    }

    // // make an api call
    // // ----------------

    // Ed.request('trigger/list', function(response){
    //   console.log('You\'ve got ' + response.triggers.length + ' triggers!');
    // });
  });

})(window,$,L);

