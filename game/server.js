var path = require('path'),
    common = require('./common.js');

exports.components    = common.components;
exports.entity_types  = common.entity_types;
exports.voxel_types   = common.voxel_types;

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
exports.createPlayer = function(account, options) {
  
  //Validate options
  if(typeof(options.player_name) != "string") {
    throw "Invalid parameters";
  }
  
  var player_rec = {
    'player_name' : options.player_name,
    'key_bindings' : common.default_bindings,
  };
  var entity_rec = {
    'player_name' : options.player_name,
    'type'        : 'player',
  };
  
  return [player_rec, entity_rec, 'Starting Area'];
};

exports.registerInstance = function(instance) {
  common.registerInstance(instance);
}

exports.registerEntity = function(entity) {
  common.registerEntity(entity);
}

