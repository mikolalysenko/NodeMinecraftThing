//----------------------------------------------------------------
// Entities are composite objects built from many communicating components
//----------------------------------------------------------------
function Entity(instance, state) {
  this.instance   = instance;
  this.state      = state;
  this.last_state = {};
  this.active     = true;
  this.deleted    = false;
  this.dirty      = false;
  this.components = [];
}

//Initialize the entity
Entity.prototype.init = function() {
  for(var i=0; i<components.length; ++i) {
    components[i].init();
  }
}

//Adds a component
Entity.prototype.addComponent = function(component) {
  this.components.push(component);
  component.register(this);
}

//Sends a message to the entity
Entity.prototype.sendMessage = function(msg) {
  for(var i=0; i<components.length; ++i) {
    components[i].sendMessage(msg);
  }
}

//Ticks the entity
Entity.prototype.tick = function() {
  for(var i=0; i<components.length; ++i) {
    components[i].tick();
  }
}

//Stop the entity (do not call this to delete an enemy, call destroy instead)
Entity.prototype.deinit = function() {
  for(var i=0; i<components.length; ++i) {
    components[i].deinit();
  }
}

//Destroys an entity
Entity.prototype.destroy = function() {
  this.instance.destroyEntity(this);
}

//Checks if an entity has been modified
Entity.prototype.checkModified = function() {

  var patch = computeAndApplyPatch(this.last_state, this.state);
  
  if(patch[0].length != 0 || 
     patch[1].length != 0 ||
     patch[2].length == 0 ) {
     instance.updateEntity(this);
  }
}

