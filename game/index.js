
//Game regions
exports.regions = [
  require('./regions/starting_area.js'),
];

//Game components
exports.components = [
  { name       : 'player',
    path       : './components/player_component.js',
    server     : true,
    client     : true,
  },
];

//Entity types
exports.entityTypes = [
  { name        : 'player',
    components  : [ 'player' ],
    server      : true,
    client      : true,
  },
];

//Voxel types
exports.voxelTypes = require('./voxels/index.js');

//Set up initial data for a player and their entity
exports.createPlayer = function(player_name, options) {
  
  var player_rec = {
    'player_name' : player_name,
  };
  
  var entity_rec = {
    'player_name' : player_name,
    'type' : 'player',
  };
  
  return [player_rec, entity_rec, 'Starting Area'];
}

//Called when a player is created within an instance
exports.registerPlayer = function(player) {
};

//Called when an instance is created
exports.registerInstance = function(instance) {
};

//Called when an entity is created
exports.registerEntity = function(entity) {
};

