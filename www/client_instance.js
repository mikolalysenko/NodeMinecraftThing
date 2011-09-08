"use strict";

function ClientInstance(region_id) {
  this.entities = {};
  this.region_id = region_id;
  this.running = false;
}

ClientInstance.prototype.start = function() {
  this.running = true;
  this.tickInterval = startInterval(this.tick, 100);
  
  for(var id in this.entities) {
    this.entities[id].init();
  }
}

ClientInstance.prototype.stop = function() {
  this.clearInterval(this.tickInterval);
}

ClientInstance.prototype.tick = function() {
  for(var id in entities) {
    if(!entities[id].active) {
      continue;
    }
    entities[id].tick();
  }
}

//Looks up an entity in the database
ClientInstance.prototype.lookupEntity = function(id) {
  if(id in entities[id] && !entities[id].deleted) {
    return entities[id];
  }
  return null;
}

ClientInstance.prototype.createEntity = function(state) {
  if(!("_id" in entities)) {
    state._id = GENOBJECTID;   //FIXME:  Put in something that does this
  }
  
  var entity = new Entity(this, state);
  this.entities[entity.state._id] = entity;
  entity.state.region = this.region_id;
  
  //TODO: Add components here
  
  if(running) {
    entity.init();
  }
}

ClientInstance.prototype.destroyEntity = function(entity_id) {
}

ClientInstance.prototype.receiveUpdate = function(mesg) {
}

