var patcher = require('./patcher.js'),
    EventEmitter = require('events').EventEmitter;

//----------------------------------------------------------------
// Client side entity object
//----------------------------------------------------------------
function Entity(instance, state) {

  if(!("_id" in state)) {
    state._id = "" + Math.random();
  }

  this.state        = state;
  this.last_state   = patcher.clone(state);
  this.net_state    = {};
  this.net_tick     = 0;
  this.type         = null;
  this.emitter      = new EventEmitter();
  this.instance     = instance;
};

//Initialize the entity (this is called by the instance at start time, do not call this)
Entity.prototype.init = function() {
  this.emitter.emit('init');
}

//Ticks the entity
Entity.prototype.tick = function() {
  this.emitter.emit('tick');
}

//Stop the entity (do not call this to delete an enemy, call destroy instead)
Entity.prototype.deinit = function() {
  this.emitter.emit('deinit');
  this.emitter.removeAllListeners();
}

//Draws the entity
Entity.prototype.draw = function() {
  this.emitter.emit('draw');
}

//Sends a message to the server on behalf of this entity
Entity.prototype.message = function(action_name) {
  var args = Array.prototype.slice.call(arguments,1);
  this.instance.engine.network.remoteMessage(action_name, this.state._id, args);
  this.emitter.emit.apply(this.emitter, ['client_' + action_name].concat(arguments));
}


//----------------------------------------------------------------
// Client side instance object
//----------------------------------------------------------------
function Instance(engine, region) {
  this.region       = region;
  this.entities     = {};
  this.running      = false;
  this.emitter      = new EventEmitter();
  this.engine       = engine;
  this.server       = false;
  this.client       = true;
  this.pending_actions = {};
  
  //Stay a bit lagged behind server
  this.region.tick_count -= 4;
}

//Returns state of all input buttons
Instance.prototype.getButtons = function() {
  return this.engine.input.getState();
}

//Adds a future action
Instance.prototype.addFuture = function(tick, fn) {

  if(this.region.tick_count >= tick) {
    console.warn("Ahead of server! (This should never happen)");
    this.region.tick_count -= 4;
  }
  else if(this.region.tick_count <= tick - 30) {
    console.warn("Client is lagging!");
    while(this.region.tick_count <= tick - 4) {
      this.tick();
    }
  }

  var actions = this.pending_actions[tick];
  if(!actions) {
    this.pending_actions[tick] = [fn];
  }
  else {
    actions.push(fn);
  }
}

//Called upon receiving a remote message
Instance.prototype.remoteMessage = function(action_name, entity_id, params) {
  if(entity_id) {
    var entity = this.lookupEntity(entity_id);
    if(!entity) {
      console.warn("Got action: " + action_name + ", for invalid entity_id: " + entity_id);
      return;
    }
    entity.emitter.emit.apply(entity.emitter, ['server_' + action_name].concat(params));
  }
  else {
    this.emitter.emit.apply(this.emitter, ['server_' + action_name].concat(params));
  }
}


//Action (usually from player)
Instance.prototype.message = function(action_name) {
  var args = Array.prototype.slice.call(arguments, 1);
  this.engine.network.remoteMessage(action_name, null, args);
  this.emitter.emit.apply(this.emitter, ['client_'+action_name].concat(args));
}


//Initialize instance
Instance.prototype.init = function() {
  this.running = true;
  
  var game_module = this.engine.game_module,
      components  = game_module.components;
  
  game_module.registerInstance(this);
  for(var id in components) {
    components[id].registerInstance(this);
  }
  this.emitter.emit('init');
}

//Shutdown instance
Instance.prototype.deinit = function() {
  this.emitter.emit('deinit');
  this.running = false;
  for(var id in this.entities) {
    this.entities[id].deinit();
  }
  this.emitter.removeAllListeners();
}

//Adds a string to the chat/game log
Instance.prototype.logHTML = function(html_str) {
  this.engine.emitter.emit('log_html', html_str);
};

//Tick instance
Instance.prototype.tick = function() {

  //Buffer previous state for rendering interpolation
  for(var id in this.entities) {
    var entity = this.entities[id];
    patcher.assign(entity.last_state, entity.state);
  }
  
  //Update instance
  this.emitter.emit('tick');
  for(var id in this.entities) {
    var entity = this.entities[id];
    this.entities[id].tick();
  }

  //Increment tick counter
  var tc = ++this.region.tick_count;

  //Execute any pending network updates
  var actions = this.pending_actions[tc];
  if(actions) {
    for(var i=0; i<actions.length; ++i) {
      var fn = actions[i];
      fn();
    }
    delete this.pending_actions[tc];
  }
}


//Updates a voxel
Instance.prototype.setVoxel = function(x, y, z, v) {
  return this.engine.voxels.setVoxel(x,y,z,v);
};

//Retrieves a voxel value
Instance.prototype.getVoxel = function(x,y,z) {
  return this.engine.voxels.getVoxel(x,y,z);
};

//Looks up an entity in the database
Instance.prototype.lookupEntity = function(id) {
  return this.entities[id];
}

//Executes a draw pass
Instance.prototype.draw = function(id, t, render, pass) {
  var n = 'draw_' + id;
  this.emitter.emit(n, t, render, pass);
  for(var id in this.entities) {
    this.entities[id].emitter.emit(n, t, render, pass);
  }
}

//Creates an entity
Instance.prototype.createEntity = function(state) {
  var entity = new Entity(this, state);
  this.entities[state._id] = entity;
  
  var game_module = this.engine.game_module,
      type_name = state.type;
  if(type_name) {
    var type = game_module.entity_types[type_name];
    entity.type = type;
    for(var i=0; i<type.components.length; ++i) {
      game_module.components[type.components[i]].registerEntity(entity);
    }
  }
  game_module.registerEntity(entity);
  
  entity.init();
  this.emitter.emit('spawn', entity);
  
  return entity;
}

//Destroys an entity
Instance.prototype.destroyEntity = function(entity) {
  if( !(typeof(entity) === "object" && entity instanceof Entity) ) {
    entity = this.entities[entity];
  }

  if(entity && entity.state._id in this.entities) {
    this.emitter.emit('destroy', entity);
    entity.deinit();  
    delete this.entities[entity.state._id];
  }
}

//Called when an entity gets updated remotely
Instance.prototype.updateEntity = function(patch) {

  if(patch._id in this.entities) {
    //If entity already exists, then incrementally patch
    var entity = this.entities[patch._id],
        emitter = entity.emitter;
    patcher.applyPatch(entity.net_state, patch);
    entity.net_tick = this.region.tick_count;
    
    //Emit net update event only if there is a special handler, otherwise just overwrite state
    if(emitter.listeners('net_update').length == 0) {
      patcher.assign(entity.state, entity.net_state);
    }
    else {
      entity.emitter.emit('net_update');
    }
  }
  else {
    //Otherwise, bootstrap by applying patch to empty entity
    var nstate = {};
    patcher.applyPatch(nstate, patch);
    var entity = this.createEntity(nstate);
    entity.net_state = patcher.clone(nstate);
    entity.net_tick = this.region.tick_count;
  }
}

//Export instance constructor
exports.Instance = Instance;
