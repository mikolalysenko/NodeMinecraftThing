"use strict";

//The preloader
var LoadGameState = {

  init : function(cb) {

    var progress = document.getElementById('progressPane');
	  progress.style.display = 'block';
	  
	  progres.innerHTML = "LOADING CHUNKS"; 
	   
    cb(null);
  },

  deinit : function(cb) {
	  document.getElementById('progressPane').style.display = 'none';
	  cb(null);
  },
};
