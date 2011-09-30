"use strict";

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    patcher = require('../client/patcher.js'),
    voxels = require('../client/voxels.js');

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
  this.net_cache  = true;       //If set along with net_replicated, keep track of entity state for each player to delta encode updates.  
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

//Sends a message to the entity
Entity.prototype.message = function(action_name) {
  var action = Array.prototype.slice.call(arguments,1);
  
  
  for(var player_id in this.instance.players) {
    var player = this.instance.players[player_id];
    if(player.entity === this) {
      player.pushMessage(action_name, this.state._id, action);
    }
  }
  this.emitter.emit.apply(this.emitter, ['server_'+action_name].concat(action));
}


//----------------------------------------------------------------
// A player connection
//----------------------------------------------------------------
function Player(instance, client, player_rec, entity_rec) {

  //Player record  
  this.state     = player_rec;
  this.entity    = null;
  
  //RPC interface
  this.net_state = 'loading';
  this.client    = client;
  this.entity_rec = entity_rec;
  
  //Instance
  this.instance = instance;
  
  //Input from client
  this.client_state = {};
  
  //Entity replication information
  this.update_interval = null;
  this.cached_entities = {};
  this.pending_entity_updates = {};
  this.pending_entity_deletes = {};
  
  //Chunk replication
  this.pending_writes = {};
}

//Pushes a message out to the client
Player.prototype.pushMessage = function(action_name, entity_id, params) {
  console.log("HERE:", action_name, entity_id, params);
  this.client.remoteMessage(this.instance.region.tick_count, action_name, entity_id, params);
}

//Pushes updates to the player over the network
Player.prototype.pushUpdates = function() {

  if(this.client.state !== 'game' ||
     this.net_state !== 'game') {
    clearInterval(this.update_interval);
    this.update_interval = null;
    return;
  }
  
  //Send update messages
  // FIXME: Prioritize updates
  var update_buffer = [];
  for(var id in this.pending_entity_updates) {
    var entity = this.instance.lookupEntity(id);
    
    if(entity.net_cache) {
      
      util.log("Cached!");
      
      if(!(id in this.cached_entities)) {
        this.cached_entities[id] = {};
      }
      
      var patch = patcher.computePatch(this.cached_entities[id], entity.state, true);
      patch._id = entity.state._id;
      update_buffer.push(patch);
      
      console.log("patch:", patch);
    }
    else {
      util.log("no cache");
      update_buffer.push(entity.state);
    }
  }
  this.pending_entity_updates = {};
  
  //Send delete messages
  var removals = [], pending_removals = this.pending_entity_deletes;
  for(var id in pending_removals) {
    removals.push(pending_removals[id]);
    removals.push(id);
  }
  this.pending_entity_deletes = {};
  
  //Send voxel updates
  var voxel_buf = [];
  for(var id in this.pending_writes) {
    var w = this.pending_writes[id];
    voxel_buf.push(parseInt(id));
    voxel_buf.push(w[0]);
    voxel_buf.push(w[1]);
  }
  this.pending_writes = {};
  
  
  //Send updates to client if necessary
  if(update_buffer.length > 0 || removals.length > 0 || voxel_buf.length > 0) {
    this.client.updateInstance(this.instance.region.tick_count, update_buffer, removals, voxel_buf);
  }
};

Player.prototype.deinit = function() {
  clearInterval(this.update_interval);
  this.net_state = 'leaving';
}


//Transmits chunks while the player is in the loading state
Player.prototype.init = function() {

  this.net_state = 'loading';
  var player = this,
      instance = player.instance;
  
  function loadComplete() {
    if(player.net_state !== 'loading') {
      return;
    }
    
    //Create player entity
    player.entity = instance.createEntity(player.entity_rec);
    player.entity.player = player;

    //Send initial copy of game state to player
    for(var id in instance.entities) {
      var entity = instance.entities[id];
      if( entity.net_replicated || entity.net_one_shot ) {
        player.updateEntity(entity);
      }
    }
    
    //Start update interval
    player.net_state = 'game';
    player.update_interval = setInterval(function() { player.pushUpdates(); }, instance.game_module.net_rate);
    player.pushUpdates();
    
    //Send a join event to all listeners
    instance.emitter.emit('join', player.entity);
  };
  
  //FIXME: This should probably send chunks in multiple parts
  function executeTransmit() {
  
    if(player.net_state !== 'loading') {
      return;
    }
    var chunk_set = instance.chunk_set,
        buffer = [];
    for(var id in chunk_set.chunks) {
      buffer.push(parseInt(id))
      buffer.push(chunk_set.chunks[id].data);
    }
    
    util.log("Transmitting chunks....");
    player.client.updateChunks(buffer, loadComplete);
  };

  //Set player to change instance
  player.client.changeInstance(player.instance.region);
  
  //Set timeout
  setTimeout(executeTransmit, 10);
}


Player.prototype.notifyWrite = function(key, val) {
  this.pending_writes[key] = [val, this.instance.region.tick_count];
}


//Deletes an entity on the client
Player.prototype.deleteEntity = function(entity) {
  var entity_id = entity.state._id;
  if(entity_id in this.cached_entities) {
    delete this.cached_entities[entity_id];
  }
  if(entity_id in this.pending_entity_updates) {
    delete this.pending_entity_updates[entity_id];
  }
  this.pending_entity_deletes[entity_id] = this.instance.region.tick_count;
}

//Marks an entity for getting updated
Player.prototype.updateEntity = function(entity) {
  this.pending_entity_updates[entity.state._id] = entity.net_priority;
}


//----------------------------------------------------------------
// An Instance is a process that simulates a region in the game.
// It keeps a local copy of all entities within the region.
//----------------------------------------------------------------
function Instance(region, db, region_set) {
  this.entities   = {};
  this.players    = {};
  this.region     = region;
  this.game_module = region_set.game_module
  this.db         = db;
  this.running    = false;
  this.region_set = region_set;
  this.emitter    = new EventEmitter();
  this.chunk_set  = new voxels.ChunkSet();
  this.dirty_chunks = {};
  this.message_log  = "";
  this.server       = true;
  this.client       = false;
}

//Called remotely on server from client
Instance.prototype.remoteMessage = function(action_name, player_id, entity_id, params) {
  var player = this.players[player_id];
  if(!player || 
    'game' !== player.net_state ||
    !player.entity ||
    typeof(action_name) != 'string' ||
    typeof(params) != 'object' ||
    !(params instanceof Array)) {
    return; 
  }
  
  if(entity_id) {
    var entity = this.lookupEntity(entity_id);
    if(entity) {
      entity.emitter.emit.apply(entity.emitter, ['remote_'+action_name, player].concat(params));
    }
  }
  else {
    this.emitter.emit.apply(this.emitter, ['remote_'+action_name, player].concat(params));
  }
}

//Local action
Instance.prototype.message = function(action_name) {

  var action = Array.prototype.slice.call(arguments,1);

  //Send action to all clients
  for(var player_id in this.players) {
    this.players[player_id].pushMessage(action_name, null, action);
  }
  this.emitter.emit.apply(this.emitter, ['server_'+action_name].concat(action));
}


//Appends an HTML string to the instance
Instance.prototype.logHTML = function(html_str) {
  util.log("LOG: " + html_str);
};

//Sets a voxel
Instance.prototype.setVoxel = function(x, y, z, v) {

  var cx = x >> voxels.CHUNK_SHIFT_X,
      cy = y >> voxels.CHUNK_SHIFT_Y,
      cz = z >> voxels.CHUNK_SHIFT_Z,
      key = voxels.hashChunk(cx,cy,cz),
      id = null;
      
  //Retrieve _id value for database update
  var chunk = this.chunk_set.chunks[key];
  if(chunk && '_id' in chunk) {
    id = chunk._id;
  }

  var p = this.chunk_set.set(x,y,z,v);
  if(p !== v) {
  
    //Mark chunk as dirty
    if(!this.dirty_chunks[key]) {
      this.dirty_chunks[key] = id;
    }
    
    //Send command to all clients
    var vkey = voxels.hashChunk(x,y,z);
    for(var id in this.players) {
      this.players[id].notifyWrite(vkey, v);
    }
  }
  return p;
};

//Retrieves a voxel
Instance.prototype.getVoxel = function(x,y,z) {
  return this.chunk_set.get(x,y,z);
};

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

  //Start running
  function startupGame() {
    inst.running = true;
  
    //Initialize all the entities
    for(var id in inst.entities) {
      inst.entities[id].init();
      inst.updateEntity(inst.entities[id]);
    }
  
    //Set up interval counters
    inst.tick_interval = setInterval( function() { inst.tick(); }, inst.game_module.tick_rate);
    inst.sync_interval = setInterval( function() { inst.sync(); }, inst.game_module.sync_rate);
    
    //Send events to game
    if(inst.region.brand_new) {
      inst.region.brand_new = false;
      inst.region.tick_count = 0;
      inst.emitter.emit('construct');
    }
    inst.emitter.emit('init');
    
    //Continue
    cb(null);
  };

  //Thaws out all entities
  function thawEntities() {
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
          startupGame();
        }      
      });
    });
  };

  //Load up all the chunks
  function loadChunks() {
    db.chunks.find({ region_id: inst.region._id }, function(err, cursor) {
      if(err) {
        cb(err);
        return;
      }
      
      cursor.each(function(err, chunk) {
        if(err !== null) {
          cb(err);
        } else if(chunk !== null) {
          inst.chunk_set.insertChunk(chunk);
        } else {
          thawEntities();
        }
      });
    });
  };
  
  
  //Start the server
  loadChunks();
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
  if( !need_check || !patcher.assign(entity.last_state, entity.state) ) {
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
  util.log("Synchronizing with database...");

  //Apply entity updates
  var e;
  for(var i=0; i<this.dirty_entities.length; ++i) {
    e = this.dirty_entities[i];
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
  
  //Synchronize all chunks
  for(var k in this.dirty_chunks) {
    var chunk = this.chunk_set.chunks[k];
    if(chunk) {
      chunk.region_id = this.region._id;
      this.db.chunks.save(chunk, sink);
    }
    else {
      var id = this.dirty_chunks[k];
      if(id) {
        this.db.chunks.remove({'_id':id}, sink);
      }
    }
  }
  this.dirty_chunks = {};
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
  
  //Add to player list
  var player = new Player(this, client, player_rec, entity_rec);
  this.players[player_rec._id] = player;
    
  //Initialize player
  player.init();
  
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
   
  //Deinit player entity
  if(player.entity) {
    this.emitter.emit('depart', player.entity);
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
  }
 
  //Deinitialie player
  player.deinit();
  delete this.players[player_id];
    
  //Save entity changes to database, and continue
  this.db.players.update(player.state, function(err0, doc0) {
    if(player.entity) {
      this.db.entities.update(player.entity.state, function(err1, doc1) {
        cb(err0 || err1);
      });
    }
    else {
      cb(err0);
    }
  });
};

//Tick all the entities in the game world
Instance.prototype.tick = function() {

  //Send a tick event to the game world
  this.emitter.emit('tick');
  
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

  //Increment region tick_count
  ++this.region.tick_count;
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
  entity.state.region_id = this.region._id;
  
  //Add components to entity
  this.region_set.registerEntity(entity);
  
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
  if(!entity_id) {
    return null;
  }
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

exports.Instance = Instance;

