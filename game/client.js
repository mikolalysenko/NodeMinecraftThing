exports.registerEngine = function(engine) {
  
  var framework   = engine.framework,
      login_state = require('./client/login_state.js'),
      error_state = require('./client/error_state.js');

  //Set up custom error handler
  engine.error_state = error_state;

  //Select WebGL for rendering
  engine.render = new framework.RenderGL(document.getElementById("gameCanvas"));

  engine.loader.fetchImage('/img/voxels.png');
  engine.loader.fetchImage('/img/spritesheet.png');
  
  engine.setState(login_state);

  console.log("Registered game engine");
};

