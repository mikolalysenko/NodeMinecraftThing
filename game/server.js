//Import default exports from common.js
exports = require('./common.js');

//Add regions
exports.regions = [
  require('./regions/starting_area.js'),
];

//Set up initial data for a player and their entity 
// (called when a new player account is created)
exports.createPlayer = function(player_name, options) {
  
  var player_rec = {
    'player_name' : player_name,
    'key_bindings' : defaultBindings,
  };
  
  var entity_rec = {
    'player_name' : player_name,
    'type'        : 'player',
  };
  
  return [player_rec, entity_rec, 'Starting Area'];
};


