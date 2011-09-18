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
    
  //Start running the game
  Game.running 		     = true;
  Game.tick_interval 	 = setInterval(Game.tick, 50)
  
  VoxelClient.init(function() {
    console.log("VoxelClient thread started");
    if(cb) {
      cb();
    }
  });
};

//Pauses/disables the game state
Game.deinit = function() {

	Game.running = false;
	if(Game.tick_interval) {
	  clearInterval(Game.tick_interval);
  }
  
	if(Game.instance) {
  	Game.instance.deinit();
	  delete Game.instance;
  }

  VoxelClient.deinit(function() {
    console.log("VoxelClient thread stopped");
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
Game.draw = function(time) {
  if(!Game.running) {
    return;
  }
  
  //Process user input before drawing each frame
  Game.input();

  //Draw all the voxels
  VoxelClient.draw();
  
  //Draw sprites
  Render.drawSprite([0,0,(-1 + Math.cos(time/5000.0)) * 50], {
    rect:((time / 100)&1 ? [64,0,96,64] : [96,0,128,64]),
    rotation:0,
    center:[16,32],
    scale:2,
  });
  
};

})();

