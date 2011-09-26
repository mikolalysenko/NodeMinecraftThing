//----------------------------------------------------------------
// Game specific logic goes here (specializations for client and server go in respective files)
//----------------------------------------------------------------

//Game tick rate
exports.tick_rate = 30;

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
    
  instance.emitter.on('action_voxel', function(entity,x,y,z) {  
    instance.setVoxel(
      Math.floor(x), 
      Math.floor(y),
      Math.floor(z),
      1);
  });


};

//----------------------------------------------------------------
//Called when an entity is created
//----------------------------------------------------------------
exports.registerEntity = function(entity) {
};

