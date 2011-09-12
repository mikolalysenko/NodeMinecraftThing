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
  mouse_state : [[0,0], [0,0]],

  //Bind all the input handlers for the game
  init : function(cb) {

    //Reset state
	  for(var i in Input.state) {
	    Input.state[i] = 0;
	  }
	  Input.mouse_state = [[0,0], [0,0]]

	  window.onkeyup = function(event) {
		  var ev = Input.keyBindings[event.keyCode];
		  if(ev) {
			  Input.state[ev] = 0;
			  return false;
		  }
		  return true;
	  };

	  window.onkeydown = function(event) {
		  var ev = Input.keyBindings[event.keyCode];
		  if(ev) {
		    if(Input.state[ev] <= 0) {
			    Input.state[ev] = 1;
        }
			  return false;
		  }
		  return true;
	  };
	
	  window.onblur = function(event) {
		  for(var i in Input.state) {
			  Input.state[i] = 0;
		  }
		  return true;
	  };
	
	  window.onmousemove = function(event) {
	
	    var w = window.innerWidth,
	        h = window.innerHeight,
		      cx = w / 2,
			    cy = h / 2;
			    
	    Input.mouse_state[1] = Input.mouse_state[0];
	    Input.mouse_state[0] = [(event.x - cx) / w, (event.y - cy) / h];
	    
		  return false;
	  };

	  window.onmousedown = function(event) {
		  var ev = Input.keyBindings[0];
		  if(ev) {
		    if(Input.state[ev] <= 0) {
			    Input.state[ev] = 1;
        }
			  return false;
		  }
		  return true;
	  };

	  window.onmouseup = function(event) {
		  var ev = Input.keyBindings[0];
		  if(ev) {
			  Input.state[ev] = 0;
			  return false;
		  }
		  return true;
	  };
	
	  window.onblur = function(event) {
		  for(var i in Input.state) {
			  Input.state[i] = 0;
		  }
		  return true;
	  };
	
	  cb(null);
  },

  //Clear input handlers
  deinit : function(cb) {
	  window.onkeyup      = null;
	  window.onkeydown    = null;
	  window.onmousemove  = null;
	  window.onmousedown  = null;
	  window.onmouseup    = null;
	  window.onblur       = null;
	  cb(null);
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
