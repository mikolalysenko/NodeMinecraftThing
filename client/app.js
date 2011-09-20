//The default state (doesn't do anything)
var DefaultState = {
	init   : function(app, cb) { cb(null); },
	deinit : function(app, cb) { cb(null); }
};

//Default error handler (in case game plugin does not specify one)
var DefaultErrorState = {
  init      : function(app, cb)  { cb(null); }
  deinit    : function(app, cb)  { cb(null); }
  postError : function(msg) { alert("ERROR: " + msg); }
};


//The application module, loads and dispatches all the other modules
function Application() {
  this.state       = DefaultState;
  this.game_module = require('game-client');    
};


//Changes the application state, if an error occurs in initialization, set error state
//This method fires an event, and so it will not block the code
Application.prototype.setState = function(next_state) {

  //Sets the application to a crashed state
  function setCrashed(err, cb) {
    App.state = ErrorState;
    App.state.postError(err);
    App.state.init(function(wtf) {
      if(wtf) {
        console.log("The error state errored? Err = " + wtf);
        throw err;
      }
      if(cb) {
        cb(err);
      }
    });
  };

  var tmp = App.state;

  //Otherwise, fire event to transition to next state
  setTimeout(function() {

    if(App.state !== tmp) {
      return;
    }
  
    //Don't transition if we are already on the correct state
    if(App.state === next_state) {
      if(cb) {
        cb(null);
      }
      return;
    }
    
    App.state = next_state;
	  tmp.deinit(function(err) {	
	    if(err) {
	      setCrashed(err, cb);
	      return;
	    }
	    else {
	      if(App.state !== next_state) {
	        return;
	      }
	      App.state.init(function(err) {
	        if(err) {
	          App.state.deinit(function(err2) {
	            if(err2) {
                ErrorState.postError(err2);
              }
	            setCrashed(err, cb);
            });
	        } else if(cb) {
	          cb(null);
	        }
	      });
	    }
	  });
	}, 1);
};

//Called to initialize the application
Application.prototype.init = function() {

  //Start renderer
  Render.init(function(err) {
    if(err) {
      App.setState(NoWebGLState);
      return;
    }
    
    //Start loading data in the background
    Loader.init();
    Loader.emitter.on('error', function(url) {
      App.crash("Missing url: " + missing_url);
      return;
    });
    
    //Connect to network
    Network.init(function(err) {
      if(err) {
        App.crash("Error connecting to server: " + err);
        return;
      }
      
      if(App.state === DefaultState) {
        App.setState(LoginState);
      }
    });
  });
};

//Shuts down the application
Application.prototype.deinit = function() {
  App.setState(DefaultState);
};


//Registers callbacks, boots up window
exports.bootstrap = function() {

  window.onload   = App.init;
  window.onunload = App.deinit;
  window.onclose  = App.deinit;
  window.onerror  = function(errMsg, url, lineno) {
    App.crash("Script error (" + url + ":" + lineno + ") -- " + errMsg);
  };
  
};


})();
