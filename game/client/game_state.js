"use strict";

//The preloader
var GameState = {

  init : function(cb) {
	  Input.init();
    document.getElementById('gamePane').style.display = 'block';
    Render.resize();
    window.onresize = Render.resize;
    Render.bindDraw(Game.draw);
    cb(null);
  },

  deinit : function(cb) {
    document.getElementById('gamePane').style.display = 'none';
    Render.clearDraw();
    window.onresize = null;
    Input.deinit();
	  cb(null);
  },
};
