
//Game components (give path to component file here)
exports.components = {
  'player' : 'components/player_component.js',
};

//Game regions
exports.regions = [
  require('./regions/starting_area.js'),
];

//Entity type classes (basically name of type, followed by list of components)
exports.entity_templates = {
  'player' : [ 'player' ],
};

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


