
exports.init = function(engine) {

  var canvas = document.getElementById('renderCanvas'),
      gamePane = document.getElementById('gamePane');
  
  window.onresize = function() {
    gamePane.width  = window.innerWidth;
		gamePane.height = window.innerHeight;
		canvas.width    = window.innerWidth;
		canvas.height   = window.innerHeight;
  };
          
  gamePane.style.display = 'block';
  window.onresize();
}

exports.deinit = function(engine) {
  window.onresize = null;
  engine.render.setActive(false);
  document.getElementById('gamePane').style.display = 'none';
  document.getElementById('renderCanvas').style.display = 'none';
}

