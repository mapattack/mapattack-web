/*global $:false, L:false */

(function(window,$,L,undefined){

  // Ed is just a simple country editor singleton object literal
  var Ed = {
    $: null,            // tricksy jquery
    cache: {},          // jquery cache
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

  // dark magic
  Ed.$ = function(selector){
    if (Ed.cache.hasOwnProperty(selector)) {
      return Ed.cache[selector];
    } else {
      Ed.cache[selector] = $(selector);
      return Ed.cache[selector];
    }
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
      popupAnchor:   [0, -13]
    }
  });

  // add a new coin to the map
  Ed.addCoin = function(latLng, pts){
    var coin = new Ed.Coin({iconUrl: '/img/coin' + pts + '.png'});

    var marker = L.marker(latLng, {icon: coin});

    marker.addTo(Ed.map).bindPopup('Worth ' + pts + ' points.');

    Ed.coins.push(marker);

    return marker;
  };

  // initialize the editor
  Ed.init = function(){

    console.log(this);

    Ed.$.tools = $('.edit-tools');
    Ed.$.line = Ed.$.tools.find('.btn.line');
    Ed.$.point = Ed.$.tools.find('.btn.point');

    // init map
    // --------

    Ed.map = L.map('editor').setView([45.50845, -122.64935], 16);

    L.tileLayer('http://{s}.mapgopher.appspot.com/{z}/{y}/{x}', {
      maxZoom: 18
    }).addTo(Ed.map);

    // init draw
    // ---------

    Ed.drawnItems = new L.FeatureGroup();
    Ed.map.addLayer(Ed.drawnItems);

    // ye olde terrible leaflet.draw control

    // Ed.drawControl = new L.Control.Draw({
    //   draw: {
    //     position: 'topleft',
    //     polygon: {
    //       title: 'Draw a sexy polygon!',
    //       allowIntersection: false,
    //       drawError: {
    //         color: '#b00b00',
    //         timeout: 1000
    //       },
    //       shapeOptions: {
    //         color: '#bada55'
    //       },
    //       showArea: true
    //     },
    //     polyline: {
    //       metric: false
    //     },
    //     circle: {
    //       shapeOptions: {
    //         color: '#662d91'
    //       }
    //     }
    //   },
    //   edit: {
    //     featureGroup: Ed.drawnItems
    //   }
    // });

    // Ed.map.addControl(Ed.drawControl);

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
        Ed.tools.point.enable();
      }

      Ed.drawnItems.addLayer(layer);
    });
  };

  // init editor when DOM is ready
  $(function(){
    Ed.init();

    // add coins
    // ---------

    Ed.addCoin([45.50845, -122.64935], 10);
    Ed.addCoin([45.50845, -122.64835], 20);
    Ed.addCoin([45.50845, -122.64735], 30);
    Ed.addCoin([45.50845, -122.64635], 40);
    Ed.addCoin([45.50845, -122.64535], 50);

    // make an api call
    // ----------------

    Ed.request('trigger/list', function(){
      console.log('hello', arguments);
    });
  });

})(window,$,L);

