"use strict";

var Game = { };

(function() {

//Initialize game state
Game.running        = false;
Game.tick_interval  = null;
Game.draw_interval  = null;
Game.drawPane

//Game instance
Game.instance       = null;

//Starts executing the game state
Game.init = function(cb) {

  //Create instance
  Game.instance = new Client.Instance();
  Game.instance.init();
  
	//Initialize input
	Input.init();

  //Show game UI and resize it
  document.getElementById('gamePane').style.display = 'block';
  Render.resize();

  //Bind necessary callbacks
  window.onresize = Render.resize;
  
  //Start running the game
  Game.running 		     = true;
  Game.tick_interval 	 = setInterval(Game.tick, 50)
  Render.bindDraw(Game.draw);

  cb(null);  
};

//Pauses/disables the game state
Game.deinit = function(cb) {

	document.getElementById('gamePane').style.display = 'none';

	Game.running = false;
	if(Game.tick_interval) {
	  clearInterval(Game.tick_interval);
  }
  Render.clearDraw();
  	
	window.onresize = null;
	
	Input.deinit();
	
	if(Game.instance) {
  	Game.instance.deinit();
	  delete Game.instance;
  }
  
  cb(null);
};

//Called when the game ticks
Game.tick = function() {
  Game.instance.tick();
};

//Process user input
Game.input = function() {
};

//Draw the game
Game.draw = function(time) {
  if(!Game.running) {
    return;
  }
  
  //Process user input before drawing each frame
  Game.input();
  
  //Draw stuff
  Render.drawSprite();
};

})();

