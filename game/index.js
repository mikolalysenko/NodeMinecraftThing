
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

//Entity templates
exports.entity_templates = [
  { name        : 'player',
    components  : [ 'player' ],
    server      : true,
    client      : true,
  },
];

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


