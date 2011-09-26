var path = require('path'),
    common = require('./common.js');

exports.components      = common.components;
exports.entity_types    = common.entity_types;
exports.voxel_types     = common.voxel_types;
exports.tick_rate       = common.tick_rate;
exports.sync_rate       = 15*60*1000;
exports.net_rate        = 50;
exports.client_throttle = 30;  //Max number of (messages per second) per client
exports.motd = 
'<h4>Welcome to the node.js MMO test!</h4>\
To chat, press "t", tab or enter.  Use WASD for movement.<br><br>'

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
    'position'    : [0,0,0],
    'velocity'    : [0,0,0],
    'sprite_class': 'player',
  };
  
  return [player_rec, entity_rec, 'Starting Area'];
};

exports.registerInstance = function(instance) {
  common.registerInstance(instance);
  
  instance.emitter.on('action_chat', function(entity, mesg) {
    if(typeof(mesg) != 'string') {
      return;
    }
    if(mesg.length > 256) {
      mesg.length = 256;
    }
  
    var n = entity.state.player_name;
    if(!n) {
      n = entity.state.type;
    }
  
    console.log(n + ":" + mesg);
  
    instance.logHTML('<b>'+n+':</b> '+
      mesg.replace('&', '&amp;')
          .replace('<', '&lt;')
          .replace('>', '&gt;') + '<br/>');
  });
  
  instance.emitter.on('join', function(player) {
    instance.logHTML('<b>' + player.state.player_name + ' joined the game!</b><br>');
  });
  
  instance.emitter.on('depart', function(player) {
    instance.logHTML('<b>' + player.state.player_name + ' left</b><br>');
  });

}

exports.registerEntity = function(entity) {
  common.registerEntity(entity);
}
