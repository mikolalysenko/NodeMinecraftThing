var common = require('./common.js');

exports.components    = common.components;
exports.entity_types  = common.entity_types;
exports.voxel_types   = common.voxel_types;

//Application states
exports.states = {
  login_state   : require('./client/login_state.js'),
  error_state   : require('./client/error_state.js'),
  create_state  : require('./client/create_state.js'),
  load_state    : require('./client/load_state.js'),
  game_state    : require('./client/game_state.js'),
};

//Called at start up
exports.registerEngine = function(engine) {
  
  //Application framework
  var framework     = engine.framework;
  
  //Set up custom error handler
  engine.error_state = exports.states.error_state;

  //Select WebGL for rendering
  engine.render = new framework.RenderGL(document.getElementById("renderCanvas"));
  
  //Set input actions
  engine.input.setButtons(common.buttons);

  //Bind loading handler
  engine.emitter.on('change_instance', function() {
    engine.setState(exports.states.load_state);
  });

  engine.loader.fetchImage('/img/voxels.png');
  engine.loader.fetchImage('/img/spritesheet.png');
  
  engine.setState(exports.states.login_state);
  
  console.log("Registered game engine");
};

exports.registerInstance = function(instance) {
  common.registerInstance(instance);
}

exports.registerEntity = function(entity) {
  common.registerEntity(entity);
}
