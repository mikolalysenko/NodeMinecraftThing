var common = require('./common.js');

exports.components    = common.components;
exports.entity_types  = common.entity_types;
exports.voxel_types   = common.voxel_types;
exports.tick_rate     = common.tick_rate;

//Application states
exports.states = {
  login_state   : require('./client/login_state.js'),
  error_state   : require('./client/error_state.js'),
  create_state  : require('./client/create_state.js'),
  load_state    : require('./client/load_state.js'),
  game_state    : require('./client/game_state.js'),
};


function handleInput(engine) {
  //Handle player input at the start of each frame
  var player = engine.player,
      entity = engine.instance.lookupEntity(player.entity_id);
      
  //Update player entity based on coordinates
}

function setupRender(engine) {

  var framework = engine.framework;

  //Select WebGL for rendering
  engine.render = new framework.RenderGL(document.getElementById("renderCanvas"));
  
  //Set up rendering passes
  engine.render.passes = [
    new framework.StandardPass({
      fov: Math.PI/8,
      z_near: 1.0,
      z_far: 1000.0,
      background_color: [0.4, 0.3, 0.8, 1.0],
    }),
    new framework.VoxelPass(engine, '/img/voxels.png'),
    new framework.SpritePass(engine, '/img/spritesheet.png'),
  ];
  
  //Set up per-frame rendering actions
  var emitter = engine.render.emitter;
  

  emitter.on('frame_begin', function() {
    handleInput(engine);
  });  
  
  emitter.on('pass_forward', function(time, render, pass) {
    //TODO: Set camera here
  });
  
  emitter.on('pass_voxels', function(time, render, pass) {
    engine.voxels.draw(time, render, pass);
  });
  
  emitter.on('pass_sprites', function(time, render, pass) {
    //Draw a test sprite
    pass.drawSprite([0,0,(-1 + Math.cos(time/5000.0)) * 50], {
      rect:((time / 100)&1 ? [64,0,96,64] : [96,0,128,64]),
      rotation:0,
      center:[16,32],
      scale:2,
    });
  });
}


//Called at start up
exports.registerEngine = function(engine) {
  
  //Application framework
  var framework     = engine.framework;
  
  //Set up custom error handler
  engine.error_state = exports.states.error_state;

  setupRender(engine);
  
  //Set input actions
  engine.input.setButtons(common.buttons);

  //Bind loading handler
  engine.emitter.on('change_instance', function() {
    engine.setState(exports.states.load_state);
  });

  engine.loader.fetchImage('/img/voxels.png');
  engine.loader.fetchImage('/img/spritesheet.png');
    
  console.log("Registered game engine");
  
  
  //Post initialization code
  setTimeout(function() {
    console.log("Post-initialization");
    engine.setState(exports.states.login_state);
  }, 0);

};

exports.registerInstance = function(instance) {
  common.registerInstance(instance);
}

exports.registerEntity = function(entity) {
  common.registerEntity(entity);
}
