
/*global angular:true, L:true, io:true, gameData:true */
var viewerApp = angular.module('MapAttackViewer', []);

viewerApp.directive('board', function() {

  // custom layer group to handle getting layers by specicic ids
  var MarkerCollection = L.LayerGroup.extend({
    getLayerId: function(layer){
      L.stamp(layer);
      return layer.options.markerId;
    }
  });

  // coin icon
  var CoinIcon = L.DivIcon.extend({
    options: {
      iconSize:      [20, 20],
      iconAnchor:    [10, 10],
      className:     'coin',
      popupAnchor:   [0, -10]
    }
  });

  var PlayerIcon = L.DivIcon.extend({
    options: {
      iconSize:      [30, 41],
      iconAnchor:    [14, 41],
      className:     'playerIcon',
      popupAnchor:   [0, -10]
    }
  });

  function createPlayerIcon(player){
    return new PlayerIcon({
      className: 'plyr ' + player.team,
      html: player.name + '<i class="player-avatar" style="background-image:url(http://api.mapattack.org/user/' + player.device_id + '.jpg);">'
    });
  }

  function createCoinIcon(coin){
    return new CoinIcon({
      className: 'coin p' + coin.value + ' ' + coin.team
    });
  }

  return {
    restrict: 'E',
    template: '<div id="viewer"></div>',
    replace: true,
    compile: function compile(tElement, tAttrs, transclude) {
      var bbox = tAttrs.bbox.split(',');
      var bounds = new L.LatLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);

      var board = L.map(tElement[0], {
        attributionControl: false,
        zoomControl: false,
      }).fitBounds(bounds, {
        paddingTopLeft: [230, 150],
        paddingBottomRight: [230, 0]
      });

      new L.Control.Zoom({ position: 'bottomleft' }).addTo(board);

      L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
        maxZoom: 18,
        subdomains: '0123'
      }).addTo(board);

      var playerMarkers = new MarkerCollection().addTo(board);
      var coinMarkers = new MarkerCollection().addTo(board);

      return function postLink(scope, iElement, iAttrs, controller) {

        // //watch for changes in players
        scope.$watch('playerLocations', function(players, oldPlayers){
          var playerIds = Object.keys(players);
          var oldPlayerIds = Object.keys(oldPlayers);

          // loop over all the current players
          for (var i = playerIds.length - 1; i >= 0; i--) {
            var playerId = playerIds[i];
            var player = players[playerId];
            var oldPlayer = oldPlayers[playerId];

            // if an old player does not exist for this id
            // or
            // if this player exists but has to latlng
            if(!oldPlayer || !playerMarkers.getLayer(playerId)){
              // create market and add to map
              var playerMarker = new L.Marker(player.latlng, {
                zIndexOffset: 1000,
                markerId: playerId,
                clickable: false,
                icon: createPlayerIcon(player)
              });
              playerMarkers.addLayer(playerMarker);
            }

            //set the players position to their current position
            if(!angular.equals(player, oldPlayer) && player.latlng){
              playerMarkers.getLayer(playerId).setLatLng(player.latlng);
            }
          }

          for (var x = oldPlayerIds.length - 1; x >= 0; x--) {
            var oldPlayerId = oldPlayerIds[x];
            // new players does not have this player in it. remove the player from the map
            if(!players[oldPlayerId]){
              playerMarkers.removeLayer(playerMarkers.getLayer(oldPlayerId));
            }
          }
        }, true);

        // //watch for changes in coins
        scope.$watch('coins', function(coins, oldCoins){
          var coinIds = Object.keys(coins);
          var oldCoinIds = Object.keys(oldCoins);

          for (var i = coinIds.length - 1; i >= 0; i--) {
            var coinId = coinIds[i];
            var coin = coins[coinId];
            var oldCoin = oldCoins[coinId];

            if(!oldCoin || !coinMarkers.getLayer(coinId)){
              var coinMarker = new L.Marker(coin.latlng, {
                id: coinId,
                clickable: false,
                zIndexOffset: 0,
                icon: createCoinIcon(coin)
              });
              coinMarkers.addLayer(coinMarker);
            }

            if(oldCoin && coin && !angular.equals(coin.team, oldCoin.team)){
              console.log("coin flip", coin);
              L.DomUtil.removeClass(coinMarkers.getLayer(coinId)._icon, null);
              L.DomUtil.addClass(coinMarkers.getLayer(coinId)._icon, coin.team);
            }
          }

          for (var x = oldCoinIds.length - 1; x >= 0; x--) {
            var oldCoinId = oldCoinIds[x];
            if(!coins[oldCoinId]){
              coinMarkers.removeLayer(coinMarkers.getLayer(oldCoinId));
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
          scope.$apply(function(){
            callback(JSON.parse(msg));
          });
        });
      });
    }
  };
});

function GameCtrl($scope, $http, socket) {
  $scope.coins = {};
  $scope.playerListing = [];
  $scope.playerLocations = {};
  $scope.game = gameData.game;

  var addPlayer = function addPlayer(player){
    $scope.playerListing.push({
      id: player.device_id,
      team: player.team,
      score: player.score,
      name: player.name
    });

    if(player.latitude && player.longitude){
      $scope.playerLocations[player.device_id] = {
        device_id: player.device_id,
        team: player.team,
        latlng: [player.latitude, player.longitude],
        name: player.name
      };
    }
  }

  var addCoin = function addCoin(coin) {
    $scope.coins[coin.coin_id] = {
      id: coin.coin_id,
      latlng: [coin.latitude, coin.longitude],
      value: coin.value,
      team: coin.team
    };
  }

  var findPlayer = function findPlayer(id) {
    for (var i = $scope.playerListing.length - 1; i >= 0; i--) {
      var player = $scope.playerListing[i];
      if(player.id === id){
        return player;
      }
    }
  }

  for (var i = gameData.players.length - 1; i >= 0; i--) {
    addPlayer(gameData.players[i]);
  }

  for (var x = gameData.coins.length - 1; x >= 0; x--) {
    addCoin(gameData.coins[x]);
  }

  socket.connect($scope, function(msg){
    console.log(msg.type, msg);
    if(msg.type === 'player'){
      // if this player is already in player locations
      if($scope.playerLocations[msg.device_id]){
        $scope.playerLocations[msg.device_id].latlng = [msg.latitude, msg.longitude];

      // if this player is in player listing
      } else if(findPlayer(msg.device_id)){
        var player = findPlayer(msg.device_id);
        $scope.playerLocations[msg.device_id] = {
          device_id: msg.device_id,
          team: player.team,
          latlng: [msg.latitude, msg.longitude],
          name: player.name
        };

      // we know nothing about this player so we have to go find them in the api and add them to the map on the next $digest cycle
      } else {
        $http.get('/games/' + $scope.game.game_id + '/state').success(function(data) {
          for (var i = data.players.length - 1; i >= 0; i--) {
            var player = data.players[i];
            if(player.device_id == msg.device_id){
              addPlayer(player);
            }
          };
        });
      }
    }

    if(msg.type === 'coin'){
      $scope.coins[msg.coin_id].team = msg.team;
      $scope.game.teams.red.score = msg.red_score;
      $scope.game.teams.blue.score = msg.blue_score;
      findPlayer(msg.device_id).score = msg.player_score;
    }
  });
}