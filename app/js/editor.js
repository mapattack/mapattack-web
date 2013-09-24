/*global $:false, L:false */

(function(window,$,L,undefined){

  var api = {};

  api.request = function(method, params, callback) {
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

  api.request('trigger/list', function(){
    console.log('hello', arguments);
  });

  // create a map in the "map" div, set the view to a given place and zoom
  var map = L.map('editor').setView([45.50845, -122.64935], 16);

  L.tileLayer('http://{s}.mapgopher.appspot.com/{z}/{y}/{x}', {
    maxZoom: 18
  }).addTo(map);

  var Coin = L.Icon.extend({
    options: {
      iconUrl:       '/img/coin10.png',
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
      popupAnchor:   [0, -10]
    }
  });

  var coin10 = new Coin({iconUrl: '/img/coin10.png'}),
      coin20 = new Coin({iconUrl: '/img/coin20.png'}),
      coin30 = new Coin({iconUrl: '/img/coin30.png'}),
      coin40 = new Coin({iconUrl: '/img/coin40.png'}),
      coin50 = new Coin({iconUrl: '/img/coin50.png'});

  var coinred10 = new Coin({iconUrl: '/img/coinred10.png'}),
      coinred20 = new Coin({iconUrl: '/img/coinred20.png'}),
      coinred30 = new Coin({iconUrl: '/img/coinred30.png'}),
      coinred40 = new Coin({iconUrl: '/img/coinred40.png'}),
      coinred50 = new Coin({iconUrl: '/img/coinred50.png'});

  var coinblue10 = new Coin({iconUrl: '/img/coinblue10.png'}),
      coinblue20 = new Coin({iconUrl: '/img/coinblue20.png'}),
      coinblue30 = new Coin({iconUrl: '/img/coinblue30.png'}),
      coinblue40 = new Coin({iconUrl: '/img/coinblue40.png'}),
      coinblue50 = new Coin({iconUrl: '/img/coinblue50.png'});

  L.marker([45.50845, -122.64935], {icon: coin10}).addTo(map).bindPopup('Worth 10 points.');
  L.marker([45.50845, -122.64835], {icon: coin20}).addTo(map).bindPopup('Worth 20 points.');
  L.marker([45.50845, -122.64735], {icon: coin30}).addTo(map).bindPopup('Worth 30 points.');
  L.marker([45.50845, -122.64635], {icon: coin40}).addTo(map).bindPopup('Worth 40 points.');
  L.marker([45.50845, -122.64535], {icon: coin50}).addTo(map).bindPopup('Worth 50 points.');

  L.marker([45.50745, -122.64935], {icon: coinred10}).addTo(map).bindPopup('Red team got 10 points.');
  L.marker([45.50745, -122.64835], {icon: coinred20}).addTo(map).bindPopup('Red team got 20 points.');
  L.marker([45.50745, -122.64735], {icon: coinred30}).addTo(map).bindPopup('Red team got 30 points.');
  L.marker([45.50745, -122.64635], {icon: coinred40}).addTo(map).bindPopup('Red team got 40 points.');
  L.marker([45.50745, -122.64535], {icon: coinred50}).addTo(map).bindPopup('Red team got 50 points.');

  L.marker([45.50945, -122.64935], {icon: coinblue10}).addTo(map).bindPopup('Blue team got 10 points.');
  L.marker([45.50945, -122.64835], {icon: coinblue20}).addTo(map).bindPopup('Blue team got 20 points.');
  L.marker([45.50945, -122.64735], {icon: coinblue30}).addTo(map).bindPopup('Blue team got 30 points.');
  L.marker([45.50945, -122.64635], {icon: coinblue40}).addTo(map).bindPopup('Blue team got 40 points.');
  L.marker([45.50945, -122.64535], {icon: coinblue50}).addTo(map).bindPopup('Blue team got 50 points.');

  var drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  var drawControl = new L.Control.Draw({
    draw: {
      position: 'topleft',
      polygon: {
        title: 'Draw a sexy polygon!',
        allowIntersection: false,
        drawError: {
          color: '#b00b00',
          timeout: 1000
        },
        shapeOptions: {
          color: '#bada55'
        },
        showArea: true
      },
      polyline: {
        metric: false
      },
      circle: {
        shapeOptions: {
          color: '#662d91'
        }
      }
    },
    edit: {
      featureGroup: drawnItems
    }
  });

  map.addControl(drawControl);

  map.on('draw:created', function (e) {
    var type = e.layerType,
      layer = e.layer;

    if (type === 'marker') {
      layer.bindPopup('A popup!');
    }

    drawnItems.addLayer(layer);
  });

})(window,$,L);

