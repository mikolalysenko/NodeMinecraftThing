var path = require('path');

//Import default exports from common.js
var common = require('./common.js');

//Path to client HTML
exports.client_html = path.join(__dirname, 'www/client.html');

//List of OpenID providers
exports.openid_providers = {
  'google': 'http://www.google.com/accounts/o8/id',
  'facebook': 'http://facebook.anyopenid.com',
  'twitter': 'http://twitter.anyopenid.com',
  'temp': 'temp',
};



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


