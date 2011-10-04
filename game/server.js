var path = require('path'),
    common = require('./common.js'),
    framework = null;

exports.registerFramework = function(framework_) {
  framework = framework_;
  common.registerFramework(framework_);
}

exports.components        = common.components;
exports.sprite_classes    = common.sprite_classes;
exports.entity_types      = common.entity_types;
exports.voxel_types       = common.voxel_types;
exports.socket_timeout    = common.socket_timeout;
exports.socket_transports = common.socket_transports;
exports.tick_rate         = common.tick_rate;
exports.net_rate          = 50;
exports.sync_rate         = 15*60*1000;    //Rate at which database gets synchronized
exports.client_throttle   = 100;  //Max number of (messages per second) per client

//Message of the day
var motd = 
'<h4>Welcome to the node.js MMO test!</h4>\
To chat, press "t", tab or enter.  Use WASD for movement. Left click to place a block!<br>\
<br>'

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
    'player_name'   : options.player_name,
    'key_bindings'  : common.default_bindings,
  };
  var entity_rec = {
    'player_name'   : options.player_name,
    'type'          : 'player',
    'motion_model'  : 'physical',
    'sprite_class'  : 'player',
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
  
    instance.logHTML('<b>'+n+':</b> '+
      mesg.replace('&', '&amp;')
          .replace('<', '&lt;')
          .replace('>', '&gt;') + '<br/>');
  });
  
  instance.emitter.on('join', function(player) {
    player.message('log', motd);
    instance.message('log', '<b>' + player.state.player_name + ' joined the game!</b><br>');
  });
  
  instance.emitter.on('depart', function(player) {
    instance.message('log', '<b>' + player.state.player_name + ' left</b><br>');
  });

}

exports.registerEntity = function(entity) {
  common.registerEntity(entity);
}
