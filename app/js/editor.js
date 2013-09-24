(function(window, $, undefined){

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

  window.map = map;
  //L.esri.basemapLayer('Streets').addTo(map);
  L.tileLayer('http://{s}.mapgopher.appspot.com/{z}/{y}/{x}', {
    maxZoom: 18
  }).addTo(map);

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

})(window, $);

