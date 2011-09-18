//----------------------------------------------------------------
// All the user specified game parameters come from this file
//----------------------------------------------------------------

// Configuration information
exports.regionInfo    = require('./regions/index.js');
exports.componentInfo = require('./components/index.js');
exports.entityInfo    = require('./entities/index.js');
exports.voxelInfo     = require('./voxels/index.js');
exports.spriteInfo    = require('./sprites/index.js');

//----------------------------------------------------------------
// Called when a player is created within an instance
//----------------------------------------------------------------
//Set up initial data for a player and their entity 
// (called when a new player account is created)
exports.createPlayer = function(player_name, options) {
  
  var player_rec = {
    'player_name' : player_name,
  };
  
  var entity_rec = {
    'player_name' : player_name,
    'type'        : 'player',
  };
  
  return [player_rec, entity_rec, 'Starting Area'];
}

//Called when a player joins an instance
exports.registerPlayer = function(player) {
};


//----------------------------------------------------------------
// Game rules for an instance
//----------------------------------------------------------------
exports.registerInstance = function(instance) {

var region    = instance.region,
    emitter   = instance.emitter;
    
emitter.on('construct', function() {
  //Called first time an instance is constructed
});

emitter.on('init', function() {
  //Instance start up
});

emitter.on('tick', function() {
  //Tick
});

emitter.on('spawn', function(entity) {
  //Entity spawn
});

emitter.on('destroy', function(entity) {
  //Entity destruction
});

emitter.on('join', function(player) {
  //Player join
});

emitter.on('depart', function(player) {
  //Player leave
});

};

//----------------------------------------------------------------
//Called when an entity is created
//----------------------------------------------------------------
exports.registerEntity = function(entity) {
};

