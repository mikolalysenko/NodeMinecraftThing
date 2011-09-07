function sink(err, result) {
  if(err) {
    console.log(err);
  }
}

//----------------------------------------------------------------
// A player connection
//----------------------------------------------------------------
function Player(player_id, socket, entity) {
  this.player_id = player_id;
  this.entity = entity;
  this.socket = socket;
  this.client_state = entity.state;
}

Player.prototype.init = function() {
}

Player.prototype.tick = function() {
}

Player.prototype.deinit = function() {
}



//----------------------------------------------------------------
// An Instance is a process that simulates a region in the game.
// It keeps a local copy of all entities within the region.
//----------------------------------------------------------------
function Instance(region, db) {
  this.region = region;
  this.db = db;
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
    
    //Thaw all the entities
    cursor.each(function(err, entity) {
      if(err != null) {
        cb(err);
      } else if(entity != null) {
        entities[entity._id] = this.thaw(entity);
      } else {
      
        //Initialize all the entities
        for(var id in this.entities) {
          this.entities[id].init();
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
Instance.prototype.stop = function() {

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
  
  //Search for dirty entities
  for(id in entities) {
    ent = entities[id];
    if(!ent.active || ent.deleted)
      continue;
    ent.checkModified();
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

//Adds an already existing entity to the instance
Instance.prototype.addEntity = function(entity) {
  entity.state.region = this.region.region_id;
  this.entities[entity.state._id] = entity;
  this.dirty_entities.push(entity.state._id);
}

//Destroy an entity
Instance.prototype.destroyEntity = function(entity) {
  if(entity.deleted) {
    return;
  }
  if(entity.destroy) {
    entity.destroy();
  }
  this.deactivateEntity(entity);
  entity.deleted = true;
  this.deleted_entities.push(entity.state._id);
}

//Update an entity's state
Instance.prototype.updateEntity = function(entity) {
  if(entity.deleted) {
    return;
  }
  if(!entity.dirty) {
    this.dirty_entities.push(entity);
  }
  
  //Mark entity in each player
  for(var player_id in this.players) {
    this.players[player_id].mark_entity(entity);
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
    db.entities.remove({id: delted_entities[i]}, sink);
  }
  deleted_entities.length = 0;
}

//Adds a player to the instance
Instance.prototype.addPlayer = function(player_id, socket) {

  //Send initial state to player for the region  ls
  
}

//Kicks a player
Instance.prototype.kickPlayer = function(player) {
}

//Creates an instance
function createInstance(region_id, db, cb) {
  
  //Get a lock on the region
  db.regions.findAndModify(
    {_id:region_id, running:false}, 
    [['_id', 'asc']], 
    {$set: {running:true}}, 
    {},
    function(err, region) {
      if(err) {
        cb(err, null);
        return;
      }
      
      //Start the instance
      var instance = new Instance(region, db);
      instance.start(cb);
    });
}


