var Entity = require("./common/entity.js").Entity;


// A function that just eats events
function sink(err, result) {
  if(err) {
    console.log(err);
  }
}


//----------------------------------------------------------------
// A player connection
//----------------------------------------------------------------
function Player(player_rec, entity) {

  //Player record  
  this.player_id = player_id;
  this.entity    = entity;
  
  //Input from client
  this.client_state = {};
  
  //Known entities
  this.known_entities = {};
  this.pending_entity_updates = [];
  this.pending_entity_deletes = [];
}


//----------------------------------------------------------------
// An Instance is a process that simulates a region in the game.
// It keeps a local copy of all entities within the region.
//----------------------------------------------------------------
function Instance(region, db, gateway) {
  this.entities   = {};
  this.players    = {};
  this.region     = region;
  this.db         = db;
  this.running    = false;
  this.gateway    = gateway;
}

//Start the instance server
Instance.prototype.start = function(cb) {  

  //Clear out local object cache
  this.entities = {};
  this.players = {};
  
  //Reset message queues
  this.dirty_entities = [];
  this.deleted_entities = [];

  //Thaw out all the objects
  db.entities.find({ region: this.region._id }, function(err, cursor) {
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
        entities[entity._id] = this.createEntity(entity);
      } else {
      
        //Start running
        this.running = true;
      
        //Initialize all the entities
        for(var id in this.entities) {
          this.entities[id].init();
          this.updateEntity(this.entities[id]);
        }
      
        //Set up interval counters
        this.tick_interval = setInterval(this.tick, 100);
        this.sync_interval = setInterval(this.sync, 5000);
        
        
        //Continue
        cb(null);
      }      
    });
  });
}

//Stops a running instance
Instance.prototype.stop = function(callback) {

  //Kick all the players
  for(var player_id in this.players) {
    this.kickPlayer(this.players[player_id]);
  }

  //Stop clocks
  clearInterval(this.tick_interval);
  clearInterval(this.sync_interval);
  
  
  //Stop all the entities and save them to the database
  for(var id in this.entities) {
    this.entities[id].deinit();
    this.db.entities.save(entities[id].state, sink);
  }  
}

//Tick all the entities in the game world
Instance.prototype.tick = function() {
  var id, ent;
  for(id in entities) {
    ent = entities[id];
    if(!ent.active || ent.deleted)
      continue;
    ent.tick();
  }
  
  //Check for any entities that got modified (need to do this after all ticks are complete)
  for(id in entities) {
    ent = entities[id];
    
    //If the entity does not need to be checked, don't do it.
    if(ent.deleted || (!(ent.persistent && !dirty) && !ent.net_replicated)) {
      continue;
    }
      
    //Check if entity got modified, do copy on write
    if(ent.checkModified()) {
      this.updateEntity(ent);
    }
  }
}

//Creates an entity from the state
Instance.prototype.createEntity = function(state) {

  //Generate entity id if needed
  if(!("_id" in state)) {
    state["_id"] = GENERATE_OBJECT_ID;  //FIXME: Do this properly
  }
  
  //Create the entity and register it
  var entity = new Entity(this, state);
  this.entities[entity.state._id] = entity;
  entity.state.region = this.region.region_id;
  
  //TODO: Add components to entity
  
  //Initialize the entity if we are running
  if(running) {
    entity.init();
    this.updateEntity(entity);
  }
}

//Looks up an entity in this region
Instance.prototype.lookupEntity = function(entity_id) {
  var e = entities[entity_id];
  if(e && !e.deleted) {
    return e;
  }
  return null;
}

//Destroy an entity
Instance.prototype.destroyEntity = function(entity_id) {
  if(!(entity_id in entities)) {
    return;
  }
  
  var entity = entities[entity_id];
  if(!entity || entity.deleted) {
    return;
  }
  
  entity.deinit();
  entity.deleted = true;
  this.deleted_entities.push(entity.state._id);
}

//Called whenever an entity's state changes
Instance.prototype.updateEntity = function(entity) {
  if(!entity || entity.deleted) {
    return;
  }
  
  if(!entity.dirty) {
    this.dirty_entities.push(entity);
  }
  
  //Mark entity in each player
  if(entity.net_replicated) {
    for(var player_id in this.players) {
      this.players[player_id].notifyEntity(entity);
    }
    
    //If entity is one-shot, only replicate it once
    if(entity.net_one_shot) {
      entity.net_replicated = false;
    }
  }
}

//Synchronize with the database
Instance.prototype.sync = function() {
  var e;
  for(var i=0; i<dirty_entities.length; ++i) {
    e = entities[dirty_entities[i]];
    if(!e.deleted) {
      db.entities.save(e.state, sink);
      e.dirty = false;
    }
  }
  dirty_entities.length = 0;

  for(var i=0; i<deleted_entities.length; ++i) {
    db.entities.remove({id: deleted_entities[i]}, sink);
  }
  deleted_entities.length = 0;
}


//Called when a player connects
Instance.prototype.addPlayer = function(player_rec) {
  console.log("Player connected: " + player_id);
}

//Called when a player diconnects
Instance.prototype.removePlayer = function(player_id) {
  console.log("Player disconnected: " + player_id);
}


exports.Instance = Instance;

