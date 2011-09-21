//Application framework files for client
exports.Framework = {
  linalg        : require('./linalg.js'),
  RenderGL      : require('./rendergl.js').RenderGL,  
  StandardPass  : require('./standard_pass.js').StandardPass,
};

//Event emitter module
var EventEmitter = require('events').EventEmitter;

//The default state (doesn't do anything)
var DefaultState = {
	init   : function(engine) { },
	deinit : function(engine) { },
}

//Default error handler (in case game plugin does not specify one)
var DefaultErrorState = {
  init      : function(engine)  { cb(null); },
  deinit    : function(engine)  { cb(null); },
  postError : function(msg)     { console.log("ERROR: " + msg); },
}

//The application module, loads and dispatches all the other modules
function Engine(game_module) {

  //Standard variables
  this.state        = DefaultState;
  this.emitter      = new EventEmitter();
  this.error_state  = DefaultErrorState;
  this.game_module  = game_module;
  this.framework    = exports.Framework;
  
  //Basic subsystems
  this.loader       = null;
  this.render       = null;
  
  //Pause/ticker
  this.tick_interval  = null;  
}

//Sets the application state
Engine.prototype.setState = function(next_state) {

  var engine = this;
  setTimeout(function() {
    try {
      if(engine.state === engine.error_state) {
        return;
      }
      engine.emitter.emit('deinit');
      engine.state.deinit();
      engine.state = next_state;
      engine.state.init();
      engine.emitter.emit('init');
    }
    catch(err) {
      engine.state = error_state;
      engine.error_state.postError("Error during state transition: " + err);
      engine.state.init();
    }
  }, 5);
}

//Initialize the engine
Engine.prototype.init = function(game_module) {

  //Initialize first subsystems
  this.loader = require('./loader.js');
  this.setPaused(false);

  //Register game module
  game_module.registerEngine(this);
   
  //Initialize renderer
  this.render.init(this);
  
  //Set the loader to initialized
  this.loader.setInit();
}

//Pauses the engine
Engine.prototype.setPaused = function(pause) {
  if(pause) {
    if(this.tick_interval) {
      clearInterval(this.tick_interval);
    }
  }
  else {
    if(this.tick_interval) {
      setInterval(this.tick_interval, function(){this.tick();});
    }
  }
}

//Ticks the engine
Engine.prototype.tick = function() {
  this.emitter.emit('tick');
}


//Creates the engine (call this in the head part of the document)
exports.createEngine = function(game_module) {

  var engine = new Engine(game_module);
  
  window.onload   = function() { engine.init(game_module); };
  window.onunload = function() { engine.setState(DefaultState); };
  window.onclose  = function() { engine.setState(DefaultState); };
  window.onerror  = function(errMsg, url, lineno) {
    engine.error_state.postError("Script error (" + url + ":" + lineno + ") -- " + errMsg);
    engine.setState(engine.error_state);
  };
}

