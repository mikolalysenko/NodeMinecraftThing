
//Event emitter module
var EventEmitter = require('events').EventEmitter,
    Instance     = require('./instance.js').Instance;

//The default state (doesn't do anything)
var DefaultState = {
	init   : function(engine) { engine.setActive(false); },
	deinit : function(engine) { },
}

//Default error handler (in case game plugin does not specify one)
var DefaultErrorState = {
  init      : function(engine)  { },
  deinit    : function(engine)  { },
  postError : function(msg)     { alert("ERROR: " + msg); },
}

//The application module, loads and dispatches all the other modules
function Engine(game_module, session_id) {

  //Framework and application specific variables
  this.state        = DefaultState;
  this.emitter      = new EventEmitter();
  this.error_state  = DefaultErrorState;
  this.game_module  = game_module;
  this.framework    = require('./framework.js');
  
  //Session and account
  this.session_id   = session_id;
  this.account      = null;
  this.player       = null;
  
  //Basic subsystems
  this.loader       = null;
  this.render       = null;
  this.input        = null;
  this.voxels       = require('./voxel_db.js');
  this.network      = null;
  this.login        = null;
  this.instance     = null;
  
  
  //Pause/ticker
  this.tick_interval  = null;  
  this.loaded_chunks  = false;
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
      engine.state.deinit(engine);
      engine.state = next_state;
      engine.state.init(engine);
      engine.emitter.emit('init');
    }
    catch(err) {
      engine.state = engine.error_state;
      engine.error_state.postError("Error during state transition: " + err);
      engine.state.init();
    }
  }, 5);
}

//Initialize the engine
Engine.prototype.init = function() {

  var engine = this;

  //Initialize first subsystems
  engine.loader = require('./loader.js');
  engine.input  = require('./input.js');
  engine.setActive(false);
  
  //Connect to the server
  require('./network.js').connectToServer(engine, function(conn) {
    console.log("Connected!");
    engine.network = conn;
    
    //Start voxel database
    engine.voxels.init(this, function() {
      
      //Set up login framework
      engine.login = new (require('./login.js').LoginHandler)(engine);
      engine.login.init(function() {
      
        //Register game module
        engine.game_module.registerEngine(engine);
        
        //Initialize second set of modules 
        engine.render.init(engine);
        engine.loader.setInit();
      });
    });
  });
}

//Pauses/unpauses the engine
Engine.prototype.setActive = function(pause) {
  this.input.setActive(pause);
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

//Crash the engine
Engine.prototype.crash = function(errMsg) {
  this.error_state.postError(errMsg);
  this.setState(this.error_state);
  this.setActive(false);
  this.network.connection.end();
}


Engine.prototype.notifyLoadComplete = function(cb) {
  this.loaded_chunks = true;
  this.emitter.emit('loaded');
  cb();
}

Engine.prototype.changeInstance = function(region_info) {

  //Set chunk state to unloaded
  this.loaded_chunks = false;

  //Create and restart
  if(this.instance) {
    this.instance.deinit();
  }  
  this.instance = new Instance(this);

  //Clear out voxel data
  this.voxels.reset();
  this.instance.init();

  this.emitter.emit('change_instance');
}

//Called upon joining an instance
Engine.prototype.notifyJoin = function(player_rec) {

  //Save player record
  this.player = player_rec;

  //Bind keys
  this.input.bindKeys(player_rec.bindings);
  
  //Start loading the instance
  this.changeInstance(null);
}

Engine.prototype.listenLoadComplete = function(cb) {
  if(this.loaded_chunks) {
    setTimeout(cb, 0);
  }
  else {
    this.emitter.once('loaded', cb);
  }
}


//Creates the engine (call this in the head part of the document)
exports.createEngine = function(game_module, session_id) {

  var engine = new Engine(game_module, session_id);
  
  window.onload   = function() { engine.init(); };
  window.onunload = function() { engine.setState(DefaultState); };
  window.onclose  = function() { engine.setState(DefaultState); };
  window.onerror  = function(errMsg, url, lineno) {
    engine.crash("Script error (" + url + ":" + lineno + ") -- " + errMsg);
  };
  
  return engine;
}
