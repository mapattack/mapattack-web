/*global $:false, L:false */

(function(window,$,L,undefined){

  var Viewer = {
    $: {},              // dom cache
    game: null,         // game meta
    Coin: null,         // Coin marker class
    coins: null,        // coins
    Player: null,       // Player marker class
    players: null,      // players
    blueTeam: null,     // blue team sorted via points
    redTeam: null,      // red team sorted via points
    map: null,          // map instance
    layerGroup: null    // layer group with all the map stuff
  };

  // coin class
  Viewer.Coin = L.Marker.extend({
    options: {
      draggable: false
    }
  });

  Viewer.CoinIcon = L.DivIcon.extend({
    options: {
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
      className:     'coin',
      popupAnchor:   [0, -10]
    }
  });

  // person class
  Viewer.Player = L.Marker.extend({
    options: {
      draggable: false
    }
  });

  Viewer.PlayerIcon = L.DivIcon.extend({
    options: {
      iconSize:      [26, 41],
      iconAnchor:    [13, 41],
      className:     'playerIcon',
      popupAnchor:   [0, -10]
    }
  });

  // initialize the viewer
  Viewer.init = function(){

    Viewer.$.viewer = $('#viewer');
    Viewer.$.title = $('.board-title');
    Viewer.$.totalPlayers = $('.total-players');
    Viewer.$.blueScore = $('.score.blue .number');
    Viewer.$.redScore = $('.score.red .number');
    Viewer.$.leaderBoardRed = $('.leaderboard.red .players');
    Viewer.$.leaderBoardBlue = $('.leaderboard.blue .players');

    // init map
    Viewer.map = L.map('viewer', {
      center: [45.522706,-122.669327],
      zoom: 12,
      scrollWheelZoom: false,
      attributionControl: false,
      zoomControl: false
    });

    new L.Control.Zoom({ position: 'bottomleft' }).addTo(Viewer.map);

    L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
      maxZoom: 18,
      subdomains: '0123'
    }).addTo(Viewer.map);

    Viewer.layerGroup = new L.LayerGroup();
    Viewer.layerGroup.addTo(Viewer.map);

    Viewer.refresh();
  };

  Viewer.update = function(){
    Viewer.updateScore();
    Viewer.updateLeaderBoards();
    Viewer.clearMap();
    Viewer.addPlayers();
    Viewer.addCoins();
  };

  Viewer.clearMap = function(){
    Viewer.layerGroup.clearLayers();
  };

  Viewer.updateScore = function(){
    Viewer.$.blueScore.html(Viewer.game.teams.blue.score);
    Viewer.$.redScore.html(Viewer.game.teams.red.score);
    var players = Viewer.game.teams.red.size + Viewer.game.teams.blue.size + ' players';
    Viewer.$.totalPlayers.html(players);
  };

  Viewer.updateLeaderBoards = function(){

    Viewer.blueTeam = [];
    Viewer.redTeam = [];

    for (var i = 0; i < Viewer.players.length; i ++){
      var p = Viewer.players[i];
      if (p.team === 'blue'){
        Viewer.blueTeam.push(p);
      } else {
        Viewer.redTeam.push(p);
      }
    }

    function rank(a,b){
      if (a.score < b.score){ return 1; }
      if (a.score > b.score){ return -1; }
      return 0;
    }

    Viewer.blueTeam.sort(rank);
    Viewer.redTeam.sort(rank);

    Viewer.$.leaderBoardBlue.empty();

    $.each(Viewer.blueTeam, function(index, player){
      var li = '<li class="player" style="background-image:url(' + player.avatar + ')"><span class="player-name">' + player.name + '</span><span class="points right">' + player.score + '</span></li>';
      Viewer.$.leaderBoardBlue.append(li);
    });

    Viewer.$.leaderBoardRed.empty();

    $.each(Viewer.redTeam, function(index, player){
      var li = '<li class="player" style="background-image:url(' + player.avatar + ')"><span class="player-name">' + player.name + '</span><span class="points right">' + player.score + '</span></li>';
      Viewer.$.leaderBoardRed.append(li);
    });

  };

  Viewer.drawPlayer = function(player) {
    var icon = new Viewer.PlayerIcon({
      className: 'plyr ' + player.team,
      html: player.name + '<i class="player-avatar" style="background-image:url(' + player.avatar + ');">'
    });

    var latLng = new L.LatLng(player.latitude, player.longitude);
    var playerMarker = new Viewer.Player(latLng, { icon: icon });
    Viewer.layerGroup.addLayer(playerMarker);
  };

  Viewer.addPlayers = function(){
    $.each(Viewer.players, function(index, player){
      if (player.latitude && player.longitude) {
        Viewer.drawPlayer(player);
      }
    });
  };

  Viewer.drawCoin = function(lat, lng, points, team) {
    var icon = new Viewer.CoinIcon({ className: 'coin p' + points + ' ' + team});
    var latLng = new L.LatLng(lat, lng);
    var coin = new Viewer.Coin(latLng, { icon: icon });

    Viewer.layerGroup.addLayer(coin);
  };

  Viewer.addCoins = function(){
    $.each(Viewer.coins, function(index, coin){
      Viewer.drawCoin(coin.latitude, coin.longitude, coin.value, coin.team);
    });
  };

  Viewer.zoomToBounds = function() {
    var layers = Viewer.layerGroup.getLayers()
    var bounds = new L.LatLngBounds();

    for (var i=0;i<layers.length;i++) {
      bounds.extend(layers[i].getLatLng());
    }

    Viewer.map.fitBounds(bounds, {
      paddingTopLeft: [0, 130]
    });
  };

  Viewer.refresh = function(){
    // replace this with call to game state route
    $.getJSON('/games/' + game_data.game.game_id + '/state', function(data){ // '/games/' + Viewer.game_id + '/state'
      // Set Data to response
      Viewer.game = data.game;
      Viewer.coins = data.coins;
      Viewer.players = data.players;

      Viewer.clearMap();
      Viewer.update();
      Viewer.zoomToBounds();
      setTimeout(Viewer.refresh, 10000);
    }).error(function(errorThrown){
      console.log(errorThrown);
    });
  };

  Viewer.api = function(method, params, callback){
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

  // init editor when DOM is ready
  $(function(){
    Viewer.init();
  });

  window.Viewer = Viewer;

})(window,$,L);
