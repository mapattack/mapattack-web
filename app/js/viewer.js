(function(window,$,L,undefined){

  // let's capitalize!!!!
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };

  // the viewer
  var Viewer = {
    $: {},              // dom cache
    map: null           // map instance
  };

  // initialize the viewer
  Viewer.init = function(){

    Viewer.$.viewer = $('#viewer');

    // init map
    Viewer.map = L.map('viewer').setView([45.50845, -122.64935], 16);

    L.tileLayer('http://mapattack-tiles-{s}.pdx.esri.com/dark/{z}/{y}/{x}', {
      maxZoom: 18,
      subdomains: '0123'
    }).addTo(Viewer.map);

  };

  // init editor when DOM is ready
  $(function(){
    Viewer.init();
  });

  window.Viewer = Viewer;

})(window,$,L);
