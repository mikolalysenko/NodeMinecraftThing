
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
  this.tick_rate      = 30;
  this.tick_interval  = null;  
  this.loaded_chunks  = false;
}

//Sets the application state
Engine.prototype.setState = function(next_state) {
  var engine = this;
  setTimeout(function() {
    if(engine.state === engine.error_state) {
      return;
    }
    try {
      engine.emitter.emit('deinit');
      engine.state.deinit(engine);
      engine.state = next_state;
      engine.state.init(engine);
      engine.emitter.emit('init');
    }
    catch(err) {
      console.log("Died during set state");
      engine.crash(err);
    }
  }, 0);
}

//Initialize the engine
Engine.prototype.init = function() {

  var engine = this;

  //Initialize first subsystems
  engine.loader = require('./loader.js');
  engine.loader.init(this);
  engine.input  = require('./input.js');
  engine.setActive(false);
  
  //Connect to the server
  require('./network.js').connectToServer(engine, function(conn) {
    console.log("Connected!");
    engine.network = conn;
    
    //Start voxel database
    engine.voxels.init(engine, function() {
      
      //Set up login framework
      engine.login = new (require('./login.js').LoginHandler)(engine);
      engine.login.init(function() {
      
        //Register game module
        try {
          engine.game_module.registerEngine(engine);
        }
        catch(err) {
          engine.crash(err);
          return;
        }
        
        //Initialize second set of modules 
        engine.render.init(engine);
        engine.loader.setReady();
      });
    });
  });
}

//Pauses/unpauses the engine
Engine.prototype.setActive = function(active) {
  if(this.input) {
    this.input.setActive(active);
  }
  if(!active) {
    if(this.tick_interval) {
      clearInterval(this.tick_interval);
      this.tick_interval = null;
    }
  }
  else {
    if(!this.tick_interval) {
      var engine = this;
      this.tick_interval = setInterval(function(){engine.tick();}, this.tick_rate);
    }
  }
}

//Ticks the engine
Engine.prototype.tick = function() {
  try {
    this.emitter.emit('tick');
  }
  catch(err) {
    this.crash(err);
  }
}

//SHUT. DOWN. EVERYTHING.
Engine.prototype.crash = function(errMsg) {

  this.error_state.postError(errMsg);

  //Shut down user code
  try {
    this.emitter.emit('crash');
  }
  catch(err) {
    this.error_state.postError(err);
  }
  
  //Shut down state
  try {
    if(this.state !== this.error_state) {
      this.emitter.emit('deinit');
      this.state.deinit(this);
    }
  }
  catch(err) {
    this.error_state.postError(err);
  }
    
  //Shut down instance
  try {
    this.setActive(false);
    if(this.instance) {
      this.instance.deinit(this);
      this.instance = null;
    }
  }
  catch(err) {
    this.error_state.postError(err);
  }

  //Shut down subsystems
  try {
    if(this.network) {
      this.network.connection.end();
      this.network = null;
    }
    if(this.loader) {
      this.loader.deinit();
      this.loader = null;
    }
    if(this.voxels) {
      this.voxels.deinit();
      this.voxels = null;
    }
    if(this.render) {
      this.render.deinit();
      this.render = null;
    }
  }
  catch(err) {
    this.error_state.postError(err);
  }
  
  //Initialize error state
  if(this.state !== this.error_state) {
    this.state = this.error_state;
    this.state.init(this);
  }
  
  //Kill listeners
  this.emitter.removeAllListeners();
  
  
}


Engine.prototype.notifyLoadComplete = function(cb) {
  console.log("Chunk loading complete");

  this.loaded_chunks = true;
  var engine = this;
  setTimeout(function() { engine.emitter.emit('loaded'); }, 0);
}

Engine.prototype.changeInstance = function(region_info) {

  console.log("Changing instances");

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

  //Called when changing instances
  var engine = this;
  setTimeout(function() { engine.emitter.emit('change_instance'); }, 0);
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

