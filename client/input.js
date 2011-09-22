var EventEmitter = require('events').EventEmitter;

var buttons     = [],
    bindings    = {},
    state       = {},
    emitter     = new EventEmitter(),
    activated   = false,
    engine      = null,
    mouse       = [[0,0],[0,0]]
    
exports.state     = state;
exports.emitter   = emitter;
exports.bindings  = bindings;

//Initialization
exports.init = function(engine) {
  this.engine = engine;
  
  engine.emitter.on('tick', function() {
    for( var i in state ) {
      if( state[i] > 0 ) {
        ++state[i];
      } else if( state[i] <= 0 ) {
        --state[i];
      }
    } 
  });
}

//Sets up keyboard buttons
exports.setButtons = function(b) {
  buttons = b;
  state   = {}
  for(var i=0; i<buttons.length; ++i) {
    state[buttons[i]] = 0;
  }
}

//Activates/deactivates input handler
exports.setActive = function(active) {
  if(active === activated) {
    return;
  }
  active = activated;
  
  if(active) {

    //Reset state
    state   = {}
    for(var i=0; i<buttons.length; ++i) {
      state[buttons[i]] = 0;
    }
    mouse = [[0,0], [0,0]];

    //Register handlers
	  window.onkeyup = function(event) {
		  var ev = bindings[event.keyCode];
		  if(ev && ev in state) {
		    if(state[ev] > 0) {
  			  emitter.emit('release', ev);
	  		  state[ev] = 0;
	  		}
			  return false;
		  }
		  return true;
	  };

	  window.onkeydown = function(event) {
		  var ev = bindings[event.keyCode];
		  if(ev && ev in state) {
		    if(state[ev] <= 0) {
			    state[ev] = 1;
			    emitter.emit('press', ev);
        }
			  return false;
		  }
		  return true;
	  };
	
	  window.onblur = function(event) {
		  for(var ev in state) {
		    if(state[ev] > 0) {
		      emitter.emit('release', ev);
		    }
			  state[ev] = 0;
		  }
		  return true;
	  };
	
	  window.onmousemove = function(event) {
	  
	    var w = window.innerWidth,
	        h = window.innerHeight,
		      cx = w / 2,
			    cy = h / 2;
			    
	    mouse[1] = mouse[0];
	    mouse[0] = [(event.x - cx) / w, (event.y - cy) / h];
	    
		  return false;
	  };

	  window.onmousedown = function(event) {
		  var ev = bindings[0];
		  if(ev && ev in state) {
		    if(state[ev] <= 0) {
		      emitter.emit('press', ev);
			    state[ev] = 1;
        }
			  return false;
		  }
		  return true;
	  };

	  window.onmouseup = function(event) {
		  var ev = bindings[0];
		  if(ev && ev in state) {
		    if(state[ev] > 0) {
		      emitter.emit('release', ev);
  			  state[ev] = 0;
  			}
			  return false;
		  }
		  return true;
	  };
  }
  else {
	  window.onkeyup      = null;
	  window.onkeydown    = null;
	  window.onmousemove  = null;
	  window.onmousedown  = null;
	  window.onmouseup    = null;
	  window.onblur       = null;
  }
}

