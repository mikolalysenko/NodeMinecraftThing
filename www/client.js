"use strict";

var Client = {};

(function() {


//----------------------------------------------------------------
// Client side entity object
//----------------------------------------------------------------
function Entity(instance, state) {

  if(!("_id" in state)) {
    state._id = "" + Math.random();
  }

  this.state        = state;
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


//----------------------------------------------------------------
// Client side instance object
//----------------------------------------------------------------

function Instance() {
  this.entities     = {};
  this.running      = false;
  this.emitter      = new EventEmitter();
}

//Initialize instance
Instance.prototype.init = function() {
  this.tickInterval = setInterval(this.tick, 100);
  this.running = true;
  for(var id in Components) {
    Components[id].registerInstance(this);
  }
}

//Shutdown instance
Instance.prototype.deinit = function() {
  this.running = false;
  if(this.tickInterval) {
    clearInterval(this.tickInterval);  
  }
  for(var id in this.entities) {
    this.entities[id].deinit();
  }
  this.emitter.removeAllListeners();
}

//Tick instance
Instance.prototype.tick = function() {
  for(var id in this.entities) {
    this.entities[id].tick();
  }
}

//Draw instance
Instance.prototype.draw = function() {
  for(var id in this.entities) {
    this.entities[id].draw();
  }
}

//Looks up an entity in the database
Instance.prototype.lookupEntity = function(id) {
  if(id in entities[id] && !entities[id].deleted) {
    return entities[id];
  }
  return null;
}

//Creates an entity
Instance.prototype.createEntity = function(state) {
  var entity = new Entity(this, state);
  this.entities[state._id] = entity;
  
  var type_name = state.type;
  if(type_name) {
    var type = EntityTypes[type_name];
    entity.type = type;
    for(var i=0; i<type.components.length; ++i) {
      Components[type.components[i]].registerEntity(entity);
    }
  }
  
  entity.init();  
  return entity;
}

//Destroys an entity
Instance.prototype.destroyEntity = function(entity) {
  if( !(typeof(entity) === "object" && entity instanceof Entity) ) {
    entity = this.entities[entity];
  }

  if(entity && entity.state._id in this.entities) {
    entity.deinit();  
    delete this.entities[entity.state._id];
  }
}

//Called when an entity gets updated
Instance.prototype.updateEntity = function(patch) {

  if(patch._id in this.entities) {
    var entity = this.entities[patch._id];
    patcher.applyPatch(entity.state, patch);
  }
  else {
    //Otherwise, bootstrap by applying patch to empty entity
    var nstate = {};
    patcher.applyPatch(nstate, patch);
    this.createEntity(nstate);
  }
}
  
//Bind client
Client.Entity     = Entity;
Client.Instance   = Instance;
  
})();
