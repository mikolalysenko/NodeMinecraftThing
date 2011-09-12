"use strict";

var Game = { };

(function() {

//Initialize game state
Game.running        = false;
Game.tick_interval  = null;
Game.draw_interval  = null;

//Game instance
Game.instance       = null;

//Starts executing the game state
Game.init = function(cb) {

	//Initialize input
	Input.init(function(err) {
	  if(err) {
	    cb(err);
	    return;
	  }
	  
	  //Create instance
	  Game.instance = new Client.Instance();
	  Game.instance.init(function(err) {
	    if(err) {
	      cb(err);
	      return;
	    }
	  
	    //Show game UI and resize it
	    document.getElementById('gamePane').style.display = 'block';
	    Render.resize();

      //Bind necessary callbacks
	    window.onresize = Render.resize;
	    
	    //Start running the game
	    Game.running 		     = true;
	    Game.tick_interval 	 = setInterval(Game.tick, 50);
	    Game.draw_interval 	 = setInterval(Game.draw, 20);
	    
	  });
	});
};

//Pauses/disables the game state
Game.deinit = function(cb) {

	document.getElementById('gamePane').style.display = 'none';

	Game.running = false;
	if(Game.tick_interval) {
	  clearInterval(Game.tick_interval);
  }
	if(Game.draw_interval) {
	  clearInterval(Game.draw_interval);
	}
	
	window.onresize = null;
	
	Input.deinit(function(err) {
	
	  if(Game.instance) {
      Game.instance.deinit(cb);
    }
	});
};

//Called when the game ticks
Game.tick = function() {
  Game.instance.tick();
};

//Process user input
Game.input = function() {
};

//Draw the game
Game.draw = function() {

  //Process user input before drawing each frame
  Game.input();
  
  //Draw the frame
  Render.beginDraw();
  
};

})();

