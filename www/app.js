"use strict";

//The preloader
var LoadState = {

	init : function() {
	  Game.preload();
		if(Loader.finished) {
			App.setState(Game);
		}
		else {
			document.getElementById('progressPane').style.display = 'block';
		}
	},

	shutdown : function() {
		document.getElementById('progressPane').style.display = 'none';
	},

	updateProgress : function(url) {
		var prog_txt = document.getElementById('progressPane');
		prog_txt.innerHTML = "Loaded: " + url + "<br\/\>%" + Loader.pct_loaded * 100.0 + " Complete";
	
		if(Loader.finished && App.state == LoadState)
		{
			App.setState(Game);
		}
	}
};

//Application crash state
var ErrorState = {

	init : function() {
		document.getElementById('errorPane').style.display = 'block';
	},

	shutdown : function() {
		document.getElementById('errorPane').style.display = 'none';
	},

	postError : function(msg) {
		//Scrub message
		msg = msg.replace(/\&/g, "&amp;")
				 .replace(/\</g, "&lt;")
				 .replace(/\>/g, "&gt;")
				 .replace(/\n/g, "\<br\/\>");
				 
		document.getElementById('errorReason').innerHTML = msg;
	}
}

//The default state (doesn't do anything)
var DefaultState = {
	init : function() { },
	shutdown : function() { }
};


//Called when the 
var NoWebGLState {
  init : function() {
    alert("Your browser does not support WebGL :(");
  },
  
  shutdown : function() {
  }
};


//The application object
var App = {
	state : DefaultState,
	
	init : function() {
		Loader.start(LoadState.updateProgress, App.crash);
		App.setState(LoadState);
	},

	shutdown : function() {
		App.setState(DefaultState);
	},

	setState : function(next_state) {
		App.state.shutdown();
		App.state = next_state;
		App.state.init();
	},
	
	crashNoWebGL : function() {
	  setState(NoWebGLState);
	  throw "No WebGL";
	}

	crash : function(msg) {
		App.setState(ErrorState);	
		App.state.postError(msg);
		throw msg;
	},
	
	postError : function(msg) {
		App.state.postError(msg);
	}
};


