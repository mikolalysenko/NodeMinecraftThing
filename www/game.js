"use strict";

var Game = {

  //If set, the game is running
	running : false,
		
	//Our local event loops
	tick_interval   : null,
	draw_interval   : null,
	input_interval  : null,
	
	//Preload resources for the game
	preload : function() {
	
		//Initialize WebGL
		Game.canvas = document.getElementById("gameCanvas");
		var gl;
		try {
			gl = Game.canvas.getContext("experimental-webgl");
		}
		catch(e) {
		  App.crashNoWebGL();
		}
		
		if(!gl) {
      App.crashNoWebGL();
		}
		Game.gl = gl;

		//Get extensions
		Game.EXT_FPTex = gl.getExtension("OES_texture_float");
		Game.EXT_StdDeriv = gl.getExtension("OES_standard_derivatives");
		Game.EXT_VertexArray = gl.getExtension("OES_vertex_array_object");	
	},
	
	//Start game
	init : function() {
		//Turn on display
		document.getElementById('gamePane').style.display = 'block';
	
		//Initialize screen
		window.onresize = function(event) {
			if(Game.running) {
				Game.resize();
			}
		}
		Game.resize();
	
		//Start running the game
		Game.running 		     = true;
		Game.tick_interval 	 = setInterval(Game.tick, GAME_TICK_RATE);
		Game.draw_interval 	 = setInterval(Game.draw, GAME_DRAW_RATE);
		Game.input_interval  = setInterval(Game.input, GAME_INPUT_RATE);
		
		//Initialize input
		Input.init();
	},

	//Stop all intervals
	shutdown : function() {
		document.getElementById('gamePane').style.display = 'none';
	
		Game.running = false;
		if(Game.tick_interval) {
		  clearInterval(Game.tick_interval);
    }
		if(Game.draw_interval) {
		  clearInterval(Game.draw_interval);
		}
		if(Game.input_interval) {
		  clearInterval(Game.input_interval);
		}
		
		window.onresize = null;
		
		Input.shutdown();		
	},

	//Resize function
	resize : function() {
		Game.canvas.width = window.innerWidth;
		Game.canvas.height = window.innerHeight;
	
		Game.width = Game.canvas.width;
		Game.height = Game.canvas.height;
	
		var appPanel = document.getElementById("gamePane");
		appPanel.width = Game.canvas.width;
		appPanel.height = Game.canvas.height;
	},
	
	//Update player state based on player input (this should happen faster than drawing events)
	input : function() {
    Input.tick();	
	},
	
	//Tick the game
	tick : function() {
	},

	//Draw the game
	draw : function() {
		var gl = Game.gl;
	
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
		gl.viewport(0, 0, Game.width, Game.height);
		gl.clearColor(0.3, 0.5, 0.9, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
	},
};

