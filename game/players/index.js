//Client side player input handler
exports.inputHandler = './players/input_handler.js';

//Buttons + default bindings
exports.buttons = [
  'action',
  'up',
  'down',
  'left',
  'right',
  'jump',
];


//Default key bindings (in javascript keycodes)
// 0 is the special keycode for left click
var defaultBindings = {
  0  : "action",
  87 : "up",
  83 : "down",
  65 : "left",
  68 : "right",
  32 : "jump",
};

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





