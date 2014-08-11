
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
      iconSize:      [30, 54],
      iconAnchor:    [15, 54],
      className:     'playerIcon',
      popupAnchor:   [0, -10]
    }
  });

  function createPlayerIcon(player){
    return new PlayerIcon({
      className: 'plyr',
      html: '<i style="background-image:url(/map-avatar/'+player.device_id+'-'+player.team+'-'+player.name+'.png);">'
    });
  }

  function createCoinIcon(coin){
    return new CoinIcon({
      className: 'coin p' + coin.value + ' ' + coin.team
    });
  }

  function createCoinMarker(coin){
    console.log(coin);
    return new L.Marker(coin.latlng, {
      markerId: coin.id,
      clickable: false,
      zIndexOffset: 0,
      icon: createCoinIcon(coin)
    });
  }

  function createPlayerMarker(player){
    return new L.Marker(player.latlng, {
      zIndexOffset: 1000,
      markerId: player.device_id,
      clickable: false,
      icon: createPlayerIcon(player)
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
        maxZoom: 17
      }).fitBounds(bounds, {
        paddingTopLeft: [230, 150],
        paddingBottomRight: [230, 0]
      });

      new L.Control.Zoom({ position: 'bottomleft' }).addTo(board);

      L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
        maxZoom: 18,
        subdomains: '0123',
        detectRetina: true
      }).addTo(board);

      var playerMarkers = new MarkerCollection().addTo(board);
      var coinMarkers = new MarkerCollection().addTo(board);

      return function postLink(scope, iElement, iAttrs, controller) {

        // //watch for changes in players
        scope.$watch('playerLocations', function(players, oldPlayers){
          var playerIds = Object.keys(players);
          var oldPlayerIds = Object.keys(oldPlayers);

          for (var i = playerIds.length - 1; i >= 0; i--) {
            var playerId = playerIds[i];
            var player = players[playerId];
            var oldPlayer = oldPlayers[playerId];

            if(!playerMarkers.getLayer(playerId)){
              playerMarkers.addLayer(createPlayerMarker(player));
            }

            if(!angular.equals(player, oldPlayer)){
              playerMarkers.getLayer(playerId).setLatLng(player.latlng);
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

            if(!coinMarkers.getLayer(coinId)){
              coinMarkers.addLayer(createCoinMarker(coin));
            }

            if(coin.team){
              L.DomUtil.addClass(coinMarkers.getLayer(coinId)._icon, coin.team);
            }
          }
        }, true);
      };
    }
  };
});

viewerApp.factory('socket', ['$rootScope', function($rootScope) {
  return {
    connect: function(gameId, callback){
      var socket = new WebSocket('ws://api.mapattack.org:8080/viewer/' + gameId);
      socket.onmessage = function(e){
        callback(JSON.parse(e.data));
        if(!$rootScope.$$phase) {
          $rootScope.$apply();
        }
      };
    }
  };
}]);

function GameCtrl($scope, $http, socket) {
  $scope.coins = {};
  $scope.playerListing = [];
  $scope.playerLocations = {};
  $scope.game = gameData.game;

  function addPlayerListing(player){
    if(!findPlayer(player.device_id)){
      $scope.playerListing.push({
        id: player.device_id,
        team: player.team,
        score: player.score,
        name: player.name
      });
    }
  }

  function addPlayerLocation(player){
    if(player.latitude && player.longitude){
      $scope.playerLocations[player.device_id] = {
        device_id: player.device_id,
        team: player.team,
        latlng: [player.latitude, player.longitude],
        name: player.name
      };
    }
  }

  function addPlayer(player){
    addPlayerLocation(player);
    addPlayerListing(player);
  }

  function addCoin(coin) {
    $scope.coins[coin.coin_id] = {
      id: coin.coin_id,
      latlng: [coin.latitude, coin.longitude],
      value: coin.value,
      team: coin.team
    };
  }

  function findPlayer(id) {
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

  socket.connect($scope.game.game_id, function(msg){
    if(msg.type === 'game_start'){
      $scope.game.active = true;
    }

    if(msg.type === 'game_end'){
      $scope.game.active = false;
    }

    if(msg.type === 'player_join'){
      var playerListing = findPlayer(msg.device_id);

      if(!playerListing) {
        addPlayerListing({
          id: msg.device_id,
          team: msg.team,
          score: 0,
          name: msg.name
        });
      }
    }

    if(msg.type === 'player'){
      var playerLocation = $scope.playerLocations[msg.device_id];

      if(playerLocation){
        playerLocation.latlng = [msg.latitude, msg.longitude];
        playerLocation.team = msg.team;
        playerLocation.name = msg.name;
      } else {
        addPlayerLocation(msg);
      }

      var playerListing = findPlayer(msg.device_id);

      if(playerListing) {
        playerListing.score = msg.score;
        playerListing.team = msg.team;
        playerListing.name = msg.name;
      } else {
        addPlayerListing(msg);
      }
    }

    if(msg.type === 'coin'){
      $scope.game.teams.red.score = msg.red_score;
      $scope.game.teams.blue.score = msg.blue_score;

      var coin = $scope.coins[msg.coin_id];

      if(coin){
        coin.team = msg.team;
      }

      var player = findPlayer(msg.device_id);

      if(player) {
        player.score = msg.player_score;
      }
    }
  });
}
