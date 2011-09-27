
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
  this.last_tick      = 0;
  this.tick_interval  = null; 
  this.net_interval   = null; 
  this.preload_complete  = false;
}


//Retrieves the player entity
Engine.prototype.playerEntity = function() {
  if(!this.instance || !this.player) {
    return null;
  }  
  return this.instance.lookupEntity(this.player.entity_id);
}

//Sets the application state
Engine.prototype.setState = function(next_state) {
  var engine = this;
  if(engine.state === engine.error_state) {
    return;
  }
  engine.emitter.emit('deinit');
  engine.state.deinit(engine);
  engine.state = next_state;
  engine.state.init(engine);
  engine.emitter.emit('init');
}

//Initialize the engine
Engine.prototype.init = function() {

  var engine = this,
      game_module = engine.game_module,
      components = game_module.components;

  //Register all components with library framework
  for(var i in components) {
    components[i].registerFramework(engine.framework);
  }

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
        game_module.registerEngine(engine);
        
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
  if(this.render) {
    this.render.setActive(active);
  }
  if(!active) {
    if(this.tick_interval) {
      clearTimeout(this.tick_interval);
      this.tick_interval = null;
    }
    if(this.net_interval) {
      clearInterval(this.net_interval);
      this.net_interval = null;
    }
  }
  else {
    var engine = this;
    if(!this.tick_interval) {
      this.last_tick = Date.now();
      
      //Can't trust web browser setInterval, not a realtime timer like node.js
      function ticker() {
        if(!engine.tick_interval) {
          return;
        }
        
        var dt;
        while(true) {
          engine.tick();
          
          engine.last_tick += engine.game_module.tick_rate;
          dt = engine.last_tick - Date.now();
          if(dt >= 0) {
            break;
          }
        }
        
        engine.tick_interval = setTimeout(ticker, dt);
      }
      
      engine.last_tick = Date.now();
      this.tick_interval = setTimeout(ticker, 0);
    }
    if(!this.net_interval) {
      this.net_interval = setInterval(function(){
        var player = engine.playerEntity();
        if(player) {
          player.emitter.emit('get_net_packet', function(packet) {
            engine.network.rpc.playerInput(packet);
          });
        }
        
      }, this.game_module.client_net_rate);
    }
  }
}

//Ticks the engine
Engine.prototype.tick = function() {

  this.emitter.emit('tick');
  if(this.instance) {
    this.instance.tick();
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

//Called upon receiving an update
Engine.prototype.notifyUpdate = function() {
  if(this.preload_complete) {
    return;
  }

  console.log("Chunk loading complete, starting local simulation");
  
  //Set engine state to loaded
  this.preload_complete = true;
  var engine = this;
  engine.emitter.emit('loaded');
  
  //Activate game engine
  engine.setActive(true);
}

Engine.prototype.changeInstance = function(region_rec) {

  console.log("Changing instances");

  //Deactivate engine
  this.setActive(false);

  //Set chunk state to unloaded
  this.preload_complete = false;

  //Create and restart
  if(this.instance) {
    this.instance.deinit();
  }
  this.instance = new Instance(this, region_rec);
  this.instance.init();

  //Clear out voxel data
  this.voxels.reset();

  //Called when changing instances
  this.emitter.emit('change_instance');
}

//Called upon joining an instance
Engine.prototype.notifyJoin = function(player_rec) {

  console.log("Entered game");

  //Save player record
  this.player = player_rec;

  //Bind keys
  this.input.bindKeys(player_rec.key_bindings);
}

Engine.prototype.listenLoadComplete = function(cb) {
  if(this.preload_complete) {
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

