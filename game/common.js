//----------------------------------------------------------------
// Game specific logic goes here (specializations for client and server go in respective files)
//----------------------------------------------------------------

//Game tick rate
exports.tick_rate         = 30;
exports.socket_timeout    = 25;
exports.socket_transports = ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling'];

//Game components
exports.components = {
  'player' : require('./components/player_component.js'),
  'sprite' : require('./components/sprite_component.js'),
};

//Entity type data
exports.entity_types = {
  'player': {
    components  : [ 'player', 'sprite' ],
  },
};

//Voxel terrain texture
exports.voxel_texture = "./voxels/voxels.png";

//Texture order
// -x, +x, -y, +y, -z, +z
exports.voxel_types = [

  { name:         'Air', 
    transparent:   true, 
    textures:     [ [0,0], [0,0], [0,0], [0,0], [0,0], [0,0] ],
  },
  
  { name:         'Stone', 
    transparent:   false, 
    textures:     [ [0,1], [0,1], [0,1], [0,1], [0,1], [0,1] ],
  },  
];

//Buttons + default bindings
exports.buttons = [
  'action',
  'up',
  'down',
  'left',
  'right',
  'jump',
  'chat',
];


//Default key bindings (in javascript keycodes)
// 0 is the special keycode for left click
exports.default_bindings = {
  0  : "action",
  87 : "up",
  83 : "down",
  65 : "left",
  68 : "right",
  32 : "jump",
  9  : "chat",
  13 : "chat",
  84 : "chat",
};


//Called when a player joins an instance
exports.registerPlayer = function(player) {
};


exports.registerInstance = function(instance) {

  var region    = instance.region,
    emitter   = instance.emitter;
    
  emitter.on('remote_chat', function(player, mesg) {
    if(typeof(mesg) !== 'string') {
      return;
    }
    
    //Sanitize message
    var player_name = player.state.player_name,
        html_str = mesg.replace('&', '&amp;')
                       .replace('<', '&lt;')
                       .replace('>', '&gt;');
    instance.message('log', '<b>' + player_name + ':</b>' + html_str + '<br>');
  });
  
  emitter.on('server_log', function(html_str) {
    instance.logHTML(html_str);
  });
  
  emitter.on('remote_voxel', function(player, x, y, z) {
  
    if(typeof(x) !== 'number' ||
       typeof(y) !== 'number' ||
       typeof(z) !== 'number') {
      return;
    }
    
    instance.setVoxel(
      Math.floor(x), 
      Math.floor(y),
      Math.floor(z),
      1);
  });
  
  emitter.on('client_voxel', function(x,y,z) {
    instance.setVoxel(x,y,z,1);
  });
};

//----------------------------------------------------------------
//Called when an entity is created
//----------------------------------------------------------------
exports.registerEntity = function(entity) {
};

