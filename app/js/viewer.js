/*global $:false, L:false */

(function(window,$,L,undefined){

  // let's capitalize!
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };

  // the viewer
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
      iconSize:      [30, 50],
      iconAnchor:    [15, 50],
      className:     'playerIcon',
      popupAnchor:   [0, -10]
    }
  });

  // initialize the viewer
  Viewer.init = function(){

    Viewer.$.viewer = $('#viewer');

    // init map
    Viewer.map = L.map('viewer', {
      center: [45.50845, -122.64935],
      zoom: 16,
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

    $.each(Viewer.blueTeam, function(index, player){
      var li = '<li class="player" style="background-image:url(' + player.avatar + ')"><span class="player-name">' + player.initials + '</span><span class="points right">' + player.score + '</span></li>';
      Viewer.$.leaderBoardBlue.append(li);
    });

    $.each(Viewer.redTeam, function(index, player){
      var li = '<li class="player" style="background-image:url(' + player.avatar + ')"><span class="player-name">' + player.initials + '</span><span class="points right">' + player.score + '</span></li>';
      Viewer.$.leaderBoardRed.append(li);
    });

  };

  Viewer.drawPlayer = function(lat, lng, initials, team) {

    var icon = new Viewer.PlayerIcon({
      className: 'plyr ' + team,
      html: initials
    });

    var latLng = new L.LatLng(lat, lng);
    var playerMarker = new Viewer.Player(latLng, { icon: icon });
    Viewer.layerGroup.addLayer(playerMarker);
  };

  Viewer.addPlayers = function(){
    $.each(Viewer.players, function(index, player){
      Viewer.drawPlayer(player.latitude, player.longitude, player.initials, player.team);
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

  Viewer.refresh = function(){
    // replace this with call to game state route
    $.getJSON('/js/response.json', function(data){
      // Set Data to response
      Viewer.game = data.game;
      Viewer.coins = data.coins;
      Viewer.players = data.players;

      Viewer.update();
    }).error(function(errorThrown){
      console.log(errorThrown);
    });
  };

  // init editor when DOM is ready
  $(function(){
    Viewer.init();
    Viewer.refresh();

    Viewer.$.title = $('.board-title');
    Viewer.$.totalPlayers = $('.total-players');
    Viewer.$.blueScore = $('.score.blue .number');
    Viewer.$.redScore = $('.score.red .number');
    Viewer.$.leaderBoardRed = $('.leaderboard.red .players');
    Viewer.$.leaderBoardBlue = $('.leaderboard.blue .players');

  });

  window.Viewer = Viewer;

})(window,$,L);
