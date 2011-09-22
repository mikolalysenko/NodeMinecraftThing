var common = require('./common.js');

exports.states = {
  login_state   : require('./client/login_state.js'),
  error_state   : require('./client/error_state.js'),
  create_state  : require('./client/create_state.js'),
};

exports.registerEngine = function(engine) {
  
  var framework     = engine.framework;
  
  //Set up custom error handler
  engine.error_state = exports.states.error_state;

  //Select WebGL for rendering
  engine.render = new framework.RenderGL(document.getElementById("renderCanvas"));
  
  //Set input actions
  engine.input.setButtons(common.buttons);

  engine.loader.fetchImage('/img/voxels.png');
  engine.loader.fetchImage('/img/spritesheet.png');
  
  engine.setState(exports.states.login_state);

  console.log("Registered game engine");
};

