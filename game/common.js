//----------------------------------------------------------------
// Game specific logic goes here (specializations for client and server go in respective files)
//----------------------------------------------------------------

//Game components
exports.components = {
  'player' : require('./components/player_component.js'),
};

//Entity type data
exports.entityTypes = {
  'player': {
    components  : [ 'player' ],
  },
};

//Voxel terrain texture
exports.voxelTexture = "./voxels/voxels.png";

//Texture order
// -x, +x, -y, +y, -z, +z
exports.voxelTypes = [

  { name:         'Air', 
    transparent:   true, 
    textures:     [ [0,0], [0,0], [0,0], [0,0], [0,0], [0,0] ],
  },
  
  { name:         'Stone', 
    transparent:   true, 
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
];


//Default key bindings (in javascript keycodes)
// 0 is the special keycode for left click
exports.defaultBindings = {
  0  : "action",
  87 : "up",
  83 : "down",
  65 : "left",
  68 : "right",
  32 : "jump",
};


//Called when a player joins an instance
exports.registerPlayer = function(player) {
};


exports.registerInstance = function(instance) {

var region    = instance.region,
    emitter   = instance.emitter;
    
emitter.on('construct', function() {
  //Called first time an instance is constructed
});

emitter.on('init', function() {
  //Instance start up
});

emitter.on('tick', function() {
  //Tick
});

emitter.on('spawn', function(entity) {
  //Entity spawn
});

emitter.on('destroy', function(entity) {
  //Entity destruction
});

emitter.on('join', function(player) {
  //Player join
});

emitter.on('depart', function(player) {
  //Player leave
});

};

//----------------------------------------------------------------
//Called when an entity is created
//----------------------------------------------------------------
exports.registerEntity = function(entity) {
};

