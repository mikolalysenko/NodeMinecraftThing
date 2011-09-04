"use strict";

var Input = {

	//Default keycodes (these can be reconfigured)
	// -1 corresponds to the mouse key code
	keys : {
	  -1 : "use",
		87 : "forward",
		83 : "backward",
		65 : "left",
		68 : "right",
		32 : "jump",
		67 : "crouch"
	},
	
	//Input state
	input : {
		"use" : 0,
		"forward" : 0,
		"backward" : 0,
		"left" : 0,
		"right" : 0,
		"jump" : 0,
		"crouch" : 0
	},
	
	//Mouse state (buffered two states back
	mouse : [$V([0,0]), $V([0,0])],
	
	//Bind all the input handlers for the document
	init : function() {
		var body = document.getElementById("docBody");
	
		document.onkeyup = function(event) {
			var ev = Player.keys[event.keyCode];
			if(ev) {
				Player.input[ev] = 0;
				return false;
			}
			return true;
		};
	
		document.onkeydown = function(event) {
			var ev = Player.keys[event.keyCode];
			if(ev) {
				Player.input[ev] = 1;
				return false;
			}
			return true;
		};
		
		document.onblur = function(event) {
			for(var i in Player.input) {
				Player.input[i] = 0;
			}
			return true;
		};
		
		body.onmousemove = function(event) {
			var cx = Game.canvas.width  / 2,
				  cy = Game.canvas.height / 2;
		  mouse_state[1] = mouse_state[0];
		  mouse_state[0] = $V([(event.x - cx) / Game.canvas.width,
			                     (event.y - cy) / Game.canvas.height ]);
			return false;
		};
	
		body.onmousedown = function(event) {
			var ev = Player.keys[-1];
			if(ev) {
				Player.input[ev] = 1;
				return false;
			}
			return true;
		};
	
		body.onmouseup = function(event) {
			var ev = Player.keys[-1];
			if(ev) {
				Player.input[ev] = 0;
				return false;
			}
			return true;
		};
		
		body.onblur = function(event) {
			for(var i in Player.input) {
				Player.input[i] = 0;
			}
			return true;
		};
	},
	
	shutdown : function() {
		var body = document.getElementById("docBody");
		document.onkeyup = null;
		document.onkeydown = null;
		body.onmousemove = null;
		body.onmousedown = null;
		body.onmouseup = null;
	}
};
