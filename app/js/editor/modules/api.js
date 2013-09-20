GeotriggerEditor.module('API', function(API, App, Backbone, Marionette, $, _) {

  API.addInitializer(function(options){
    this.session = {};
    this.session.request = function(method, params, callback) {
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
    }
  });

});
