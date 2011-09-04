"use strict";

//The preloader
var LoadState = {

	init : function()
	{
		if(Game.preload())
		{
			if(Loader.finished)
			{
				App.set_state(Game);
			}
			else
			{
				document.getElementById('progressPane').style.display = 'block';
			}
		}
	},

	shutdown : function()
	{
		document.getElementById('progressPane').style.display = 'none';
	},

	update_progress : function(url)
	{
		var prog_txt = document.getElementById('progressPane');
		prog_txt.innerHTML = "Loaded: " + url + "<br\/\>%" + Loader.pct_loaded * 100.0 + " Complete";
	
		if(Loader.finished && App.state == LoadState)
		{
			App.set_state(Game);
		}
	}
};

//Application crash state
var ErrorState = {

	init : function()
	{
		document.getElementById('errorPane').style.display = 'block';
	},

	shutdown : function()
	{
		document.getElementById('errorPane').style.display = 'none';
	},

	post_error : function(msg)
	{
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


//The application object
var App = {
	state : DefaultState,
	
	init : function()
	{
		Loader.start(LoadState.update_progress, App.crash);
		App.set_state(LoadState);
	},

	shutdown : function()
	{
		App.set_state(DefaultState);
	},

	set_state : function(next_state)
	{
		App.state.shutdown();
		App.state = next_state;
		App.state.init();
	},

	crash : function(msg)
	{
		App.set_state(ErrorState);	
		App.state.post_error(msg);
	},
	
	post_error : function(msg)
	{
		App.state.post_error(msg);
	}
};


