//----------------------------------------------------------------
// A player connection
//----------------------------------------------------------------
function Player(player_id, socket, entity) {

  this.player_id = player_id;
  this.entity    = entity;
  this.socket    = socket;
  
  //Input from client
  this.client_state = {};
  
  //Known entities
  this.known_entities = {};
  this.pending_entity_updates = [];
  this.pending_entity_deletes = [];
}

Player.prototype.init = function() {
}

Player.prototype.tick = function() {
}

Player.prototype.deinit = function() {
}

Player.prototype.notifyEntity = function(entity) {
  

  this.pending_entities.push(entity);
}

Player.prototype.removeEntity = function(entity) {
  //Marks an entity for removal
}
