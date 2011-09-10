"use strict";

//Client page for no webgl
var NoWebGLState = {
  init : function(cb) {
    document.getElementById('noGLPane').style.display = 'block';
    document.getElementById('videoItem').innerHTML = '<iframe width="560" height="345" src="http://www.youtube.com/embed/bV8Yus_atoE" frameborder="0" allowfullscreen></iframe>';
    cb(null);
  },
  
  deinit : function(cb) {
    cb(null);
  }
};

