/*global angular:true, L:true, io:true, game_data:true */
var viewerApp = angular.module('MapAttackViewer', []);

viewerApp.directive('board', function() {

  var playerMarkers = {};
  var coinMarkers = {};

  // coin class
  var CoinMarker = L.Marker.extend({
    options: {
      draggable: false,
      clickable: false
    }
  });

  var CoinIcon = L.DivIcon.extend({
    options: {
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
      className:     'coin',
      popupAnchor:   [0, -10]
    }
  });

  // person class
  var PlayerMarker = L.Marker.extend({
    options: {
      draggable: false,
      clickable: false
    }
  });

  var PlayerIcon = L.DivIcon.extend({
    options: {
      iconSize:      [28, 41],
      iconAnchor:    [14, 41],
      className:     'playerIcon',
      popupAnchor:   [0, -10]
    }
  });

  return {
    restrict: 'E',
    template: '<div id="viewer"></div>',
    replace: true,
    compile: function compile(tElement, tAttrs, transclude) {

      var board = L.map(tElement[0], {
        center: [45.522706,-122.669327],
        zoom: 12,
        attributionControl: false,
        zoomControl: false
      });

      new L.Control.Zoom({ position: 'bottomleft' }).addTo(board);

      L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
        maxZoom: 18,
        subdomains: '0123',
        //detectRetina: true
      }).addTo(board);

      return function postLink(scope, iElement, iAttrs, controller) {
        scope.$watch('game.bbox', function(extent){
          if(extent){
            var bound = new L.LatLngBounds([extent[1], extent[0]], [extent[3], extent[2]]);
            board.setMaxBounds(bound.pad(2.5));
            board.fitBounds(bound.pad(1.25));
          }
        }, true);

        // watch for changes in players
        scope.$watch('playerLocations', function(players, oldPlayers){
          var playerIds = Object.keys(players);
          var oldPlayerIds = Object.keys(oldPlayers);

          // loop over all the current players
          for (var i = playerIds.length - 1; i >= 0; i--) {
            var playerId = playerIds[i];
            var player = players[playerId];
            var oldPlayer = oldPlayers[playerId];

            // if an old player does not exist for this id
            if(!oldPlayer){
              // setup watch on player location
              // create market and add to map
              var playerMarker = new PlayerMarker(player.latlng, {
                icon: new PlayerIcon({
                  className: 'plyr ' + player.team,
                  html: player.name + '<i class="player-avatar" style="background-image:url(http://api.mapattack.org/user/' + player.device_id + '.jpg);">'
                })
              });
              playerMarker.addTo(board);
              playerMarkers[playerId] = playerMarker;
            }

            // set the players position to their current position
            if(oldPlayer && player && !(new L.LatLng(player.latlng).equals(oldPlayer.latlng))){
              playerMarkers[playerId].setLatLng(player.latlng);
            }
          }

          for (var x = oldPlayerIds.length - 1; x >= 0; i--) {
            var oldPlayerId = oldPlayerIds[x];
            // new players does not have this player in it. remove the player from the map
            if(!players[oldPlayerId]){
              board.removeLayer(playerMarkers[oldPlayerId]);
            }
          }
        }, true);

        // watch for changes in coins
        scope.$watch('coins', function(newCoins, oldCoins){
          var newCoinIds = Object.keys(newCoins);
          var oldCoinIds = Object.keys(oldCoins);
          var newCoin;
          var oldCoin;

          // loop over all the
          for (var i = newCoinIds.length - 1; i >= 0; i--) {
            var newCoinId = newCoinIds[i];
            newCoin = newCoins[newCoinId];
            oldCoin = oldCoins[newCoinId];

            // old coins does not have this coin, so make a new marker and add it to the map
            if(!oldCoins[newCoinId]){
              var coinMarker = new CoinMarker(newCoin.latlng, {
                icon: new CoinIcon({
                  className: 'coin p' + newCoin.value + ' ' + newCoin.team
                })
              });
              coinMarker.addTo(board);
              coinMarkers[newCoinId] = coinMarker;
            }

            if(oldCoin && newCoin && (oldCoin.team !== newCoin.team)){
              L.DomUtil.removeClass(coinMarkers[newCoinId]._icon, null);
              L.DomUtil.addClass(coinMarkers[newCoinId]._icon, newCoin.team);
            }
          }

          for (var x = oldCoinIds.length - 1; x >= 0; i--) {
            var oldCoinId = oldCoinIds[x];

            // new coins does not have this coin, this means the coin was deleted
            if(!newCoins[oldCoinId]){
              // remove marker from mamp
              board.removeLayer(coinMarkers[oldCoinId]);
            }
          }
        }, true);
      };
    }
  };
});

viewerApp.factory('socket', function() {
  return {
    connect: function(scope, callback){
      var socket = io.connect('http://api.mapattack.org:8000');
      socket.on('game_id', function() {
        socket.emit('game_id', scope.game.game_id);
        socket.on('data', function(msg){
          callback(JSON.parse(msg));
          scope.$digest();
        });
      });
    }
  };
});

function GameCtrl($scope, $http, socket) {
  $scope.ready = false;
  $scope.game = {
    teams: {
      red: {
        size: '--',
        score: '--'
      },
      blue: {
        size: '--',
        score: '--'
      }
    }
  };

  $scope.coins = {};
  $scope.playerListing = [];
  $scope.playerLocations = {};

  $http.get('/games/' + game_data.game.game_id + '/state').success(function(data) {
    $scope.game = data.game;

    for (var i = data.players.length - 1; i >= 0; i--) {
      var player = data.players[i];

      $scope.playerListing.push({
        id: player.device_id,
        team: player.team,
        score: player.score,
        name: player.name
      });

      $scope.playerLocations[player.device_id] = {
        device_id: player.device_id,
        team: player.team,
        latlng: [player.latitude, player.longitude],
        name: player.name
      };
    }

    for (var x = data.coins.length - 1; x >= 0; x--) {
      var coin = data.coins[x];
      $scope.coins[coin.coin_id] = {
        id: coin.coin_id,
        latlng: [coin.latitude, coin.longitude],
        value: coin.value,
        team: coin.team
      };
    }

    socket.connect($scope, function(msg){
      if(msg.type === 'player'){
        $scope.playerLocations[msg.device_id].latlng = [msg.latitude, msg.longitude];
      }

      if(msg.type === 'coin'){
        $scope.coins[msg.coin_id].team = msg.team;
        $scope.game.teams.red.score = msg.red_score;
        $scope.game.teams.blue.score = msg.blue_score;
        for (var i = $scope.playerListing.length - 1; i >= 0; i--) {
          var player = $scope.playerListing[i];
          if(player.id === msg.device_id){
            player.score = msg.player_score;
          }
        }
      }
    });
    $scope.ready = true;
  });
}