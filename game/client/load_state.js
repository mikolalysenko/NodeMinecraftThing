"use strict";

//The preloader
var LoadState = {

  init : function(cb) {

    var progress = document.getElementById('progressPane');
	  progress.style.display = 'block';
	
	  Loader.emitter.on('progress', function(url, completed, pending) {
	    var pct = completed / pending * 100.0;
      progress.innerHTML = "Loaded: " + url + "<br\/\>%" + pct + " Complete";
    });
    
    Loader.listenFinished(function() {
      App.setState(GameState);
    });
    
    cb(null);
  },

  deinit : function(cb) {
	  document.getElementById('progressPane').style.display = 'none';
	  cb(null);
  },
};
