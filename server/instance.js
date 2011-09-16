var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    patcher = require("./patcher.js");

// A function that just eats events (called when updating the database)
function sink(err, result) {
  if(err) {
    util.log(err);
  }
}


//----------------------------------------------------------------
// Entities are composite objects built from many communicating components.
//  In other words,
//    + state
//    + components
//    + an event emitter
//
// On the client side we need to reimplement event-listener, and also we can ignore
// many of the networking/database variables
//----------------------------------------------------------------
function Entity(instance, state) {

  //Public variables
  this.state      = state;       //A local cache of the database record representing this entity's state
                                 //This data is what gets written to both the DB and the client.
                                 // Put only dicts, arrays and pods in here, no fancy object types.
  this.type       = null;          //Static entity type information
  this.emitter    = new EventEmitter();   //Event emitter for sending events
  this.instance   = instance;    //A reference to the region instance this entity is in


  //Server-side only variables
  this.persistent = true;        //If set, entity gets stored to db.  This is done using copy-on-write semantics.
  this.net_replicated = true;    //If set, then the entity gets sent across the network
                                 // Useful for objects that are important for the client or have long lives.
  this.net_cache  = false;       //If set along with net_replicated, keep track of entity state for each player to delta encode updates.  
                                 // Useful for big entities with, small frequently changing variables.
  this.net_one_shot = false;     //If set, only replicate entity creation event.  Do not synchronize after creation.
                                 // Useful for projectiles and other shortly lived objects
  this.net_priority = 1.0;       //Replication priority
  this.last_state = {};          //Last state entity was in
  this.deleted    = false;       //When set, the entity has been marked for deletion.  This object reference is just a zombie
  this.dirty      = false;       //If set, the entity has pending writes and will be moved to DB at next sync point
}

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

//Checks if an entity was modified
Entity.prototype.checkModified = function() {
  return !!patcher.computePatch(this.last_state, this.state, true);
}


//----------------------------------------------------------------
// A player connection
//----------------------------------------------------------------
function Player(instance, client, player_rec, entity) {

  //Player record  
  this.state     = player_rec;
  this.entity    = entity;
  this.emitter   = new EventEmitter();
  
  //RPC interface
  this.client    = client;
  
  //Instance
  this.instance = instance;
  
  //Input from client
  this.client_state = {};
  
  //Entity replication information
  this.cached_entities = {};
  this.pending_entity_updates = {};
  this.pending_entity_deletes = {};
}

Player.prototype.init = function(instance) {
  var player = this;
  this.update_interval = setInterval(function() { player.pushUpdates(); }, 50);
  this.emitter.emit('init');
}

Player.prototype.deinit = function() {
  clearInterval(this.update_interval);
  this.emitter.emit('deinit');
  this.emitter.removeAllListeners();
}

Player.prototype.tick = function() {
  this.emitter.emit('tick');
}

//Deletes an entity on the client
Player.prototype.deleteEntity = function(entity) {
  util.log("Client: " + this.state._id + ", deleting entity: " + entity.state._id);

  var entity_id = entity.state._id;
  if(entity_id in this.cached_entities) {
    delete this.cached_entities[entity_id];
  }
  if(entity_id in this.pending_entity_updates) {
    delete this.pending_entity_updates[entity_id];
  }
  this.pending_entity_deletes[entity_id] = true;
}

//Marks an entity for getting updated
Player.prototype.updateEntity = function(entity) {
  this.pending_entity_updates[entity.state._id] = entity.net_priority;
}

//Pushes updates to the player over the network
Player.prototype.pushUpdates = function() {

  if(this.client.state !== "game") {
    return;
  }
  
  //Send update messages
  // FIXME: Prioritize updates
  var buffer = [];
  for(var id in this.pending_entity_updates) {
    var entity = this.instance.lookupEntity(id);
    
    if(entity.net_cached) {
      
      if(!(id in cached_entities)) {
        cached_entities[id] = {};
      }
      
      var patch = patcher.computePatch(known_entities[id], entity.state);
      patch._id = entity.state._id;
      buffer.push(patch);
    }
    else {
      buffer.push(entity.state);
    }
  }
  if(buffer.length > 0) {
    this.client.rpc.updateEntities(buffer);
    this.pending_entity_updates = {};
  }
  
  //Send delete messages
  var removals = [];
  for(var id in this.pending_entity_deletes) {
    removals.push(id);
  }
  if(removals.length > 0) {
    this.client.rpc.deleteEntities(removals);
    this.pending_entity_deletes = {};
  }
}

//----------------------------------------------------------------
// An Instance is a process that simulates a region in the game.
// It keeps a local copy of all entities within the region.
//----------------------------------------------------------------
function Instance(region, db, gateway, rules) {
  this.entities   = {};
  this.players    = {};
  this.region     = region;
  this.db         = db;
  this.running    = false;
  this.gateway    = gateway;
  this.rules      = rules;
  this.emitter    = new EventEmitter();
}

Instance.prototype.TICK_TIME    = 50;
Instance.prototype.SYNC_TIME    = 60 * 1000;

//Start the instance server
Instance.prototype.start = function(cb) {  

  //Clear out local object cache
  this.entities = {};
  this.players = {};
  
  //Reset message queues
  this.dirty_entities = [];
  this.deleted_entities = [];
  
  //Save ref to db
  var db    = this.db,
      inst  = this;

  //Thaw out all the objects
  db.entities.find({ region_id: inst.region._id }, function(err, cursor) {
    //Check for database error
    if(err) {
      cb(err);
      return;
    }
        
    //Iterate over result set
    cursor.each(function(err, entity) {
      if(err !== null) {
        cb(err);
      } else if(entity !== null) {
        //Do not instantiate player entities until they actually connect
        if(entity.type && entity.type == 'player') {
          return;
        }
        inst.entities[entity._id] = inst.createEntity(entity);
      } else {
      
        //Start running
        inst.running = true;
      
        //Initialize all the entities
        for(var id in inst.entities) {
          inst.entities[id].init();
          inst.updateEntity(inst.entities[id]);
        }
      
        //Set up interval counters
        inst.tick_interval = setInterval( function() { inst.tick(); }, inst.TICK_TIME);
        inst.sync_interval = setInterval( function() { inst.sync(); }, inst.SYNC_TIME);
        
        //Send events to game
        inst.rules.registerInstance(inst);
        if(inst.region.brand_new) {
          inst.region.brand_new = false;
          inst.emitter.emit('construct');
        }
        inst.emitter.emit('init');
        
        //Continue
        cb(null);
      }      
    });
  });
}

//Tick all the entities in the game world
Instance.prototype.tick = function() {

  //Send a tick event to the game world
  this.emitter.emit('tick');
  
  //Tick all players
  for(var pl in this.players) {
    this.players[pl].tick();
  }

  //Tick all the entities
  var id, ent;
  for(id in this.entities) {
    ent = this.entities[id];
    if(ent.deleted)
      continue;
    ent.tick();
  }
  
  //Check for any entities that got modified (need to do this after all ticks are complete)
  for(id in this.entities) {
    this.updateEntity(this.entities[id]);
  }
}

//Creates an entity from the state
Instance.prototype.createEntity = function(state) {

  //Generate entity id if needed
  if(!("_id" in state)) {
    state["_id"] = new ObjectID();
  }
  
  //Create the entity and register it
  var entity = new Entity(this, state);
  this.entities[entity.state._id] = entity;
  entity.state.region_id = this.region.region_id;
  
  //Add components to entity
  this.rules.registerEntity(entity);
  
  //Initialize the entity if we are running
  if(this.running) {
    entity.init();
    this.emitter.emit('spawn', entity);
    this.updateEntity(entity);
  }
  
  return entity;
}

//Looks up an entity in this region
Instance.prototype.lookupEntity = function(entity_id) {
  var e = this.entities[entity_id];
  if(e && !e.deleted) {
    return e;
  }
  return null;
}

//Destroy an entity
Instance.prototype.destroyEntity = function(entity) {

  if( !(typeof(entity) === "object" && entity instanceof Entity) ) {
    entity = this.entities[entity];
  }
  if(!entity || entity.deleted) {
    return;
  }
  
  this.emitter.emit('destroy', entity);

  //Deinitialize entity  
  entity.deinit();
  
  //Remove from database
  if(entity.persistent) {
    entity.deleted = true;
    this.deleted_entities.push(entity.state._id);
  }
  else {
    delete this.entities[entity.state._id];
  }
  
  //Send message out to players if needed
  if(entity.net_replicated) {
    for(var pl in this.players) {
      this.players[pl].deleteEntity(entity);
    }
  }
}

//Called whenever an entity's state changes
Instance.prototype.updateEntity = function(entity) {
  if(!entity || entity.deleted) {
    return;
  }
  
  var persistent = entity.persistent && (!entity.dirty),
      replicated = entity.net_replicated,
      need_check = persistent || replicated; 
  
  //Check if the entity was modified
  if( !(need_check && entity.checkModified()) ) {
    return;
  }
  
  //If the entity is not dirty
  if(persistent) {
    entity.dirty = true;
    this.dirty_entities.push(entity);
  }
  
  //Mark entity in each player
  if(replicated) {
    for(var player_id in this.players) {
      this.players[player_id].updateEntity(entity);
    }
    
    //If entity is one-shot, only replicate it once
    if(entity.net_one_shot) {
      entity.net_replicated = false;
    }
  }
}

//Synchronize with the database
Instance.prototype.sync = function() {

  //Apply entity updates
  var e;
  for(var i=0; i<this.dirty_entities.length; ++i) {
    e = this.dirty_entities[i];
    util.log("Syncing: " + JSON.stringify(e.state));
    if(!e.deleted) {
      this.db.entities.save(e.state, sink);
      e.dirty = false;
    }
  }
  this.dirty_entities.length = 0;

  //Apply entity deletes
  for(var i=0; i<this.deleted_entities.length; ++i) {
    this.db.entities.remove({'_id': this.deleted_entities[i]}, sink);
  }
  this.deleted_entities.length = 0;
  
  //Synchronize all players
  for(var pl in this.players) {
    this.db.players.update(pl.state, sink);
  }
  
  //Synchronize region
  this.db.regions.update(this.region, sink);
}


//Called when a player enters the instance
Instance.prototype.activatePlayer = function(client, player_rec, entity_rec, cb) {
  
  if((player_rec.entity_id in this.entities) ||
     (player_rec._id in this.players) ) {
    cb("Player already in instance");
    return;
  }
  
  //Set client instance
  client.instance = this;
  
  //Create the player entity
  var player_entity = this.createEntity(entity_rec);
  
  //Add to player list
  var player = new Player(this, client, player_rec, player_entity);
  this.players[player_rec._id] = player;
  
  //Initialize player
  this.rules.registerPlayer(player);
  player.init();
  
  //Send a join event to all listeners
  this.emitter.emit('join', player);
    
  //Send initial copy of game state to player
  for(var id in this.entities) {
    var entity = this.entities[id];
    if( entity.net_replicated || entity.net_one_shot ) {
      player.updateEntity(entity);
    }
  }
  
  //Done
  cb(null);
}

//Called when a player leaves the instance
Instance.prototype.deactivatePlayer = function(player_id, cb) {
  
  //Remove from player list
  var player = this.players[player_id];
  if(!player) {
    cb("Player does not exist");
    return;
  }
  
  this.emitter.emit('depart', player);
  
  player.deinit();
  delete this.players[player_id];
  
  var entity_id = player.entity.state._id;
  
  //Remove player from dirty entity list
  for(var i=0; i<this.dirty_entities.length; ++i) {
    if(this.dirty_entities[i] == entity_id) {
      this.dirty_entities[i] = this.dirty_entities[this.dirty_entities.length-1];
      this.dirty_entities.length = this.dirty_entities.length -1;
    }
  }
  
  //Remove from entity list
  delete this.entities[entity_id];
  
  //Remove entity from all players
  for(var pl in this.players) {
    this.players[pl].deleteEntity(player.entity);
  }
  
  //Save entity changes to database, and continue
  this.db.players.update(player.state, function(err0, doc0) {
    this.db.entities.update(player.entity.state, function(err1, doc1) {
      cb(err0 || err1);
    });
  });
}

exports.Instance = Instance;

