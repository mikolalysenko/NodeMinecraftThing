
//Game components
exports.components = [];

//Game regions
exports.regions = [

  { region_name: 'Starting Area' },
  
  { region_name: 'Dungeon' },
];

//Player spawn location/parameter function
exports.playerSpawn = function(player_name) {
  return { region: 'Starting Area' };
}

//Entity type classes
exports.entity_types = {
  'player' : [],
};

