GeotriggerEditor.module('Views', function(Views, App, Backbone, Marionette, $, _) {

  // Controls View
  // -------------
  //
  // Displays controls and handles state of drawer and tools.

  Views.Controls = Marionette.ItemView.extend({
    template: App.Templates['controls'],
    className: 'gt-control-group',

    events: {
      'click .gt-tool-polygon'    : 'togglePolygon',
      'click .gt-tool-radius'     : 'toggleRadius'
    },

    ui: {
      'tools'   : '.gt-tool-controls',
      'polygon' : '.gt-tool-controls .gt-tool-polygon',
      'radius'  : '.gt-tool-controls .gt-tool-radius',
      'all'     : '.gt-tool'
    },

    onRender: function() {
      this.listenTo(App.vent, 'draw:new', this.disableTool);
      this.listenTo(App.vent, 'draw:enable', function(tool){
        this.activate(tool);
      });
      this.listenTo(App.vent, 'draw:disable', function(tool){
        this.ui.tools.find('.gt-tool').removeClass('gt-active');
      });
    },

    handleStateChange: function(route) {
      this.clear('drawers');
      switch (route) {
        case 'new':
          this.activate('list');
          break;
        case 'edit':
          this.activate('list');
          break;
        case 'list':
          this.activate('list');
          break;
      }
    },

    // tools

    togglePolygon: function(e) {
      if (this.ui.polygon.hasClass('gt-active')) {
        this.disableTool('polygon');
      } else {
        this.enableTool('polygon');
      }
    },

    toggleRadius: function(e) {
      if (this.ui.radius.hasClass('gt-active')) {
        this.disableTool('radius');
      } else {
        this.enableTool('radius');
      }
    },

    enableTool: function(tool) {
      this.disableTool();
      App.vent.trigger('draw:enable', tool);
    },

    disableTool: function(tool) {
      App.vent.trigger('draw:disable', tool);
    },

    // helpers

    activate: function(name) {
      this.ui[name].addClass('gt-active');
    },

    toggle: function(name) {
      if (name === 'list') {
        this.ui.list.toggleClass('gt-active');
        this.ui.create.removeClass('gt-active');
      } else if (name === 'create') {
        this.ui.create.toggleClass('gt-active');
        this.ui.list.removeClass('gt-active');
      }
    },

    clear: function(name) {
      if (name === 'drawers') {
        this.ui.drawers.find('.gt-tool').removeClass('gt-active');
      } else if (name === 'tools') {
        this.ui.tools.find('.gt-tool').removeClass('gt-active');
      } else {
        this.ui.all.removeClass('gt-active');
      }
    }
  });

});
