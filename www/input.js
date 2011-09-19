"use strict";

var Input = {

  //0 is for the mouse button
  keyBindings : { },

  //Input state
  // > 0 means has been pressed for 
  state : { },

  //Bind all the input handlers for the game
  init : function() {

    //Reset state
    Input.state = {};
    for(var i=0; i<PlayerInfo.Buttons.length; ++i) {
	    Input.state[PlayerInfo.Buttons[i]] = 0;
	  }
	  Input.state.mouse = [[0,0], [0,0]];

	  window.onkeyup = function(event) {
		  var ev = Input.keyBindings[event.keyCode];
		  if(ev && ev in Input.state) {
			  Input.state[ev] = 0;
			  return false;
		  }
		  return true;
	  };

	  window.onkeydown = function(event) {
		  var ev = Input.keyBindings[event.keyCode];
		  if(ev && ev in Input.state) {
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
			    
	    Input.state.mouse[1] = Input.state.mouse[0];
	    Input.state.mouse[0] = [(event.x - cx) / w, (event.y - cy) / h];
	    
		  return false;
	  };

	  window.onmousedown = function(event) {
		  var ev = Input.keyBindings[0];
		  if(ev && ev in Input.state) {
		    if(Input.state[ev] <= 0) {
			    Input.state[ev] = 1;
        }
			  return false;
		  }
		  return true;
	  };

	  window.onmouseup = function(event) {
		  var ev = Input.keyBindings[0];
		  if(ev && ev in Input.state) {
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
  },

  //Clear input handlers
  deinit : function() {
	  window.onkeyup      = null;
	  window.onkeydown    = null;
	  window.onmousemove  = null;
	  window.onmousedown  = null;
	  window.onmouseup    = null;
	  window.onblur       = null;
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
  },  
};
