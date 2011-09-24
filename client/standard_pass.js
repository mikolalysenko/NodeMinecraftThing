function StandardPass(options) {
  this.name             = 'forward'
  this.fov_y            = (options.fov ? options.fov : Math.PI/8.0);
  this.z_near           = (options.z_near ? options.z_near : 0.01);
  this.z_far            = (options.z_far ? options.z_far : 1000.0);
  this.background_color = (options.background_color ? options.background_color : [0.3, 0.5, 0.9, 1.0]);
}

StandardPass.prototype.begin = function(time, render) {
  var gl = render.gl,
      bg = this.background_color,
      w = render.canvas.width,
      h = render.canvas.height;
  
  //Reset opengl state  
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
  gl.viewport(0, 0, w, h);
  gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.disable(gl.BLEND);

  //Set up camera matrices
  var i;
  for(i=0; i<16; ++i) {
    render.view_matrix[i]    = 0.0;
  }
  for(i=0; i<4; ++i) {
    render.view_matrix[5*i]  = 1.0;
  }
  render.perspective(
      this.fov_y, 
      w / h, 
      this.z_near, 
      this.z_far);
}

StandardPass.prototype.end = function(render) {
}

exports.StandardPass = StandardPass;
