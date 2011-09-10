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
