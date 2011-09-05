"use strict";

var Input = {

  //0 is for the mouse button
	keyBindings : {
	  0  : "action",
		87 : "up",
		83 : "down",
		65 : "left",
		68 : "right",
		32 : "jump",
		67 : "crouch"
	},
	
	//Input state
	// > 0 means has been pressed for 
	state : {
		"action" : 0,
		"up" : 0,
		"down" : 0,
		"left" : 0,
		"right" : 0,
		"jump" : 0,
		"crouch" : 0
	},
	
	//Mouse state (buffered two states back
	mouse_state : [$V([0,0]), $V([0,0])],
	
	//Bind all the input handlers for the document
	init : function() {
		var body = document.getElementById("docBody");
	
	  //Reset state
		for(var i in Input.state) {
		  Input.state[i] = 0;
		}
		Input.mouse_state = [$V([0,0]), $V([0,0])]
	
		document.onkeyup = function(event) {
			var ev = Input.keyBindings[event.keyCode];
			if(ev) {
				Input.state[ev] = 0;
				return false;
			}
			return true;
		};
	
		document.onkeydown = function(event) {
			var ev = Input.keyBindings[event.keyCode];
			if(ev) {
				Input.state[ev] = 1;
				return false;
			}
			return true;
		};
		
		document.onblur = function(event) {
			for(var i in Input.state) {
				Input.state[i] = 0;
			}
			return true;
		};
		
		body.onmousemove = function(event) {
			var cx = Game.canvas.width  / 2,
				  cy = Game.canvas.height / 2;
		  Input.mouse_state[1] = Input.mouse_state[0];
		  Input.mouse_state[0] = $V([(event.x - cx) / Game.canvas.width,
			                     (event.y - cy) / Game.canvas.height ]);
			return false;
		};
	
		body.onmousedown = function(event) {
			var ev = Input.keyBindings[0];
			if(ev) {
				Input.state[ev] = 1;
				return false;
			}
			return true;
		};
	
		body.onmouseup = function(event) {
			var ev = Input.keyBindings[0];
			if(ev) {
				Input.state[ev] = 0;
				return false;
			}
			return true;
		};
		
		body.onblur = function(event) {
			for(var i in Input.state) {
				Input.state[i] = 0;
			}
			return true;
		};
	},
	
	//Clear input handlers
	shutdown : function() {
		var body = document.getElementById("docBody");
		document.onkeyup = null;
		document.onkeydown = null;
		body.onmousemove = null;
		body.onmousedown = null;
		body.onmouseup = null;
	},
	
	//Update input state
	tick : function() {
	  for( var i in Input.state ) {
	    if( Input.state[i] > 0 ) {
	      Input.state[i]++;
	    } else if( Input.state[i] <= 0 ) {
	      Input.state[i]--;
	    }
	  }
	}
};
