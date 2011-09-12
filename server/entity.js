var EventEmitter = require('events').EventEmitter;

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

  //State variables
  this.state      = state;       //A local cache of the database record representing this entity's state
                                 //This data is what gets written to both the DB and the client.
                                 // Put only dicts, arrays and pods in here, no fancy object types.

  //Event handler
  this.emitter    = new EventEmitter();   //Event emitter for sending events

  //Server-side config                     
  this.active     = true;        //When turned off, tick is not called on the entity.  Entity is not updated or replicated to database (used for player entities when not logged in, for example)
  this.persistent = false;       //If set, entity gets stored to db.  This is done using copy-on-write semantics.
  this.net_replicated = false;   //If set, then the entity gets sent across the network
                                 // Useful for objects that are important for the client or have long lives.
  this.net_cache  = false;       //If set along with net_replicated, keep track of entity state for each player to delta encode updates.  
                                 // Useful for big entities with, small frequently changing variables.
  this.net_one_shot = false;     //If set, only replicate entity creation event.  Do not synchronize after creation.
                                 // Useful for projectiles and other shortly lived objects

  //Internal variables
  this.instance   = instance;    //A reference to the region instance this entity is in
  this.last_state = {};          //Last state entity was in
  this.components = [];          //The entity component set
  this.deleted    = false;       //When set, the entity has been marked for deletion.  This object reference is just a zombie
  this.dirty      = false;       //If set, the entity has pending writes and will be moved to DB at next sync point
}

//--------------------------------------------------------
// Methods that game logic and scripts should never call:
//--------------------------------------------------------

//Adds a component to the entity
Entity.prototype.addComponent = function(component) {
  this.components.push(component);
  component.register(this);
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
}

exports.Entity = Entity;

