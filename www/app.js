"use strict";

var App = { };

(function(){

//The default state (doesn't do anything)
var DefaultState = {
	init   : function(cc) { cc(null); },
	deinit : function(cc) { cc(null); }
};

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

//Set application state to default state initially
App.state = DefaultState;

//Changes the application state, if an error occurs in initialization, set error state
//This method fires an event, and so it will not block the code
App.setState = function(next_state, cb) {

  //Otherwise, fire event to transition to next state
  setTimeout(function() {
  
    //Don't transition if we are already on the correct state
    if(state === next_state) {
      if(cb) {
        cb(null);
      }
      return;
    }

	  App.state.deinit(function(err) {	
	    if(err) {
	      setCrashed(err, cb);
	      return;
	    }
	    else {
	      App.state = next_state;
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
App.init = function() {

  //Start loading data in the background
  Loader.init(function(missing_url) {
    App.crash("Missing url: " + missing_url);
    return;
  });


  //Connect to network
  Network.init(function(err) {
    if(err) {
      App.crash("Error connecting to server: " + err);
      return;
    }

    //Initialize WebGL/rendering stuff
    Render.init(function(err) {
      if(err) {
        App.setState(NoWebGLState);
        return;
      }
      else {
        App.setState(LoginState);
        return;
      }
    });
  });
};

//Shuts down the application
App.deinit = function() {
  App.setState(DefaultState);
};

//Called when something errors out
App.crash = function(err) {
  ErrorState.postMessage(err);
  App.setState(ErrorState);
  throw Error("!!!ERROR!!!");
};


//Register call backs
window.onload   = App.init;
window.onunload = App.deinit;
window.onclose  = App.deinit;
window.onerror  = function(errMsg, url, lineno) {
  App.crash("Script error (" + url + ":" + lineno + ") -- " + errMsg);
};

})();
