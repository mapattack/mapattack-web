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

  // Ed methods

  // make any Geotrigger API request
  Ed.request = function(method, params, callback){
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
      triggerId: null,
      clickable: false
    }
  });

  Ed.Board = L.Polygon.extend({
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

  Ed.GeoJSON = L.GeoJSON.extend({
    style: function (feature) {
      return {
        color: '#2EBF30',
        weight: 2,
        opacity: 0.2,
        fill: true,
        fillOpacity: 0,
        triggerId: null,
        clickable: false
      };
    }
  });

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

  // initialize the editor
  Ed.init = function(callback){

    Ed.$.editor = $('#editor');
    Ed.$.title = Ed.$.tools.find('input.title');
    Ed.$.city = Ed.$.tools.find('input.city');

    // init map
    // --------

    Ed.map = L.map('editor', {
      center: [45.522706,-122.669327],
      zoom: 12,
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
    Ed.extra = new L.FeatureGroup();
    Ed.map.addLayer(Ed.coins);
    Ed.map.addLayer(Ed.triggers);
    Ed.map.addLayer(Ed.extra);

    // init board (async)

    board.init(callback);

  };

  // init editor when DOM is ready
  $(Ed.init);

  // expose Ed for debugs
  window.Ed = Ed;

})(window,$,L);
