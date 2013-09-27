/*global $:false, L:false */

(function(window,$,L,undefined){

  // let's capitalize!
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };

  // the viewer
  var Viewer = {
    $: {},              // dom cache
    game: null,         // game response
    map: null           // map instance
  };

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

  };

  Viewer.update = function(){
    Viewer.clearMap();
    Viewer.updateScore();
    Viewer.updatePlayers();
    Viewer.updateCoins();
  };

  Viewer.clearMap = function(){
    console.log('map cleared');
  };

  Viewer.updateScore = function(){
    console.log('score updated');
  };

  Viewer.updatePlayers = function(){
    console.log('players updated');
  };

  Viewer.updateCoins = function(){
    console.log('coins updated');
  };

  Viewer.refresh = function(){
    // replace this with call to game state route
    $.getJSON('/js/response.json', function(data){
      Viewer.game = data;
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

  });

  window.Viewer = Viewer;

})(window,$,L);
