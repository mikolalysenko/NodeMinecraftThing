var common = require('./common.js'),
    framework = null;

exports.components      = common.components;
exports.entity_types    = common.entity_types;
exports.voxel_types     = common.voxel_types;
exports.tick_rate       = common.tick_rate;
exports.client_net_rate = 50;

//Application states
exports.states = {
  login_state   : require('./client/login_state.js'),
  error_state   : require('./client/error_state.js'),
  create_state  : require('./client/create_state.js'),
  load_state    : require('./client/load_state.js'),
  game_state    : require('./client/game_state.js'),
};

//Render the scene
function setupRender(engine) {

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
  
  emitter.on('pass_forward', function(t, render, pass) {
    
    var player_entity = engine.playerEntity();
    if(!player_entity) {
      return;
    }
    
    //Set up player camera
    var pos = framework.tools.renderPosition(player_entity, t),
        eye = [pos[0], pos[1]+3, pos[2]],
        up  = [0, 0, -1];
    render.lookAt(eye, pos, up);
  });
  
  emitter.on('pass_voxels', function(time, render, pass) {
    engine.voxels.draw(time, render, pass);
  });
  
  emitter.on('pass_sprites', function(time, render, pass) {
    engine.instance.draw('sprites', time, render, pass);
  });
}


//Called at start up
exports.registerEngine = function(engine) {
  
  //Application framework
  framework = engine.framework;
  
  //Set up custom error handler
  engine.error_state = exports.states.error_state;

  //Set up rendering
  setupRender(engine);
  
  //Set input actions
  engine.input.setButtons(common.buttons);

  //Bind loading handler
  engine.emitter.on('change_instance', function() {
    engine.setState(exports.states.load_state);
  });
  
  //Bind chat log handler
  engine.emitter.on('log_html', function(str) {
    var chat_log = document.getElementById('uiChatLog');
    chat_log.innerHTML += str;
    chat_log.scrollTop = chat_log.scrollHeight;
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
