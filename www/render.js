"use strict";

var Render = {

  //Background color for the renderer
  background_color : [ 0.3, 0.5, 0.9, 1.0 ],
  
  //Default perspective parameters  
  fov_y   : Math.PI/4.0,
  z_near  : 1.0,
  z_far   : 1000.0,
  
  textures : {},
};

(function(){

  //Private variables for rendering context
  var canvas = document.getElementById("renderCanvas"),
      gl = null,
      EXT_FPTex,
      EXT_StdDeriv,
      EXT_VertexArray,
      textures = Render.textures,
      sprite_texture,
      view_matrix = new Float32Array(16),
      proj_matrix = new Float32Array(16);  

  //Initialize the renderer
  Render.init = function(cb) {
  	//Initialize WebGL
		canvas = document.getElementById("renderCanvas");
		try {
			gl = canvas.getContext("experimental-webgl");
		}
		catch(e) {
		  cb(e);
		  return;
		}
		
		if(!gl) {
      cb("WebGL not supported");
      return;
		}
		
		//Make gl object public
		Render.gl = gl;

		//Get extensions
		EXT_FPTex = gl.getExtension("OES_texture_float");
		EXT_StdDeriv = gl.getExtension("OES_standard_derivatives");
		EXT_VertexArray = gl.getExtension("OES_vertex_array_object");
		
		//Done
		cb(null);
  };
  
  //Generates a texture for a given image
  Loader.emitter.on('image', function(url, img) {
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    textures[url] = { 'width':img.width, 'height':img.height, 'texture':tex };
  });
  
  
  //Creates a shader object
  // frag_src = fragment shader source/url
  // vert_src = vertex shader srouce/url
  //  options = if explicit_frag is set, don't retrieve frag_src, instead just use frag_src as shader.  Similarly for explicit_vert.
  function genShader(frag_src, vert_src, options) {
  
    var frag_url = frag_src,
        vert_url = vert_src;
  
    if(!options["explicit_frag"]) {
      frag_src = Loader.data[frag_url];
      if(!frag_src) {
        App.crash("Could not find fragment shader: " + frag_url);
        return;
      }
    }
    
    if(!options["explicit_vert"]) {
      vert_src = Loader.data[vert_url];
      if(!vert_src) {
        App.crash("Could not find vertex shader: " + vert_url);
        return;
      }
    }
    
    //Helper method to create a shader object
    var makeShaderObject = function(type, src, url) {
      var shader_obj = gl.createShader(type == 'vs' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
      
      gl.shaderSource(shader_obj, src);
      gl.compileShader(shader_obj);
      
		  if(!gl.getShaderParameter(shader_obj, gl.COMPILE_STATUS)) {
		    ErrorState.postError("Error compling shader: " + url + 
		        "\n\nReason: " + gl.getShaderInfoLog(shader));
        return null;
		  }
		  return shader_obj;
    };
    
    var frag_shader = getShader('fs', frag_src, frag_url),
        vert_shader = getShader('vs', vert_src, vert_url);
        
    if(!frag_shader || !vert_shader) {
      App.crash("Shader compile error!");
      return;
    }
    
    var prog = gl.createProgram();
    
    gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		
		if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			App.crash("Shader link error (" + frag_url +", " + vs_url + "): Could not link shaders");
		}

		return prog;
  };


    
  //Shutdown renderer
  Render.deinit = function(cb) {
    cb(null);
  };
  
  //Resize the canvas
  Render.resize = function() {
  
    //Update height variables
		Render.width  = canvas.width  = window.innerWidth;
		Render.height = canvas.height = window.innerHeight;
	
	  //Resize app panel
		var appPanel    = document.getElementById("gamePane");
		appPanel.width  = canvas.width;
		appPanel.height = canvas.height;
  };
  
  
  //Sets projection matrix to a perspective matrix
  Render.perspective = function(fov_y, aspect, z_near, z_far) {
    for(var i=0; i<16; ++i) {
      proj_matrix[i] = 0;
    }
    
    var f = 1.0/Math.tan(0.5 * fov_y);
    proj_matrix[0]  = f / aspect;
    proj_matrix[5]  = f;
    proj_matrix[10] = (z_far + z_near) / (z_near - z_far);
    proj_matrix[11] = (2.0 * z_far * z_near) / (z_near - z_far);
    proj_matrix[14] = -1;
  };

  //Sets camera to look at a particular target
  Render.lookAt = function(eye, center, up) {
    var f = [0.0,0.0,0.0], fmag=0.0, umag=0.0;
    for(var i=0; i<3; ++i) {
      f[i] = center[i] - eye[i];
      fmag += f[i]*f[i];
      umag += u[i]*u[i];
    }
    
    fmag = -1.0/Math.sqrt(fmag);
    umag =  1.0/Math.sqrt(umag);
    
    var s = [
      f[1]*u[2] - f[2]*u[1],
      f[2]*u[0] - f[0]*u[2],
      f[0]*u[1] - f[1]*u[2] ], smag = 0.0;
      
    for(i=0; i<3; ++i) {
      smag += s[i]*s[i];
    }
    smag = 1.0/Math.sqrt(smag);
  
    var M = view_matrix;
    for(i=0; i<3; ++i) {
      M[i]    = s[i] * smag;
      M[4+i]  = u[i] * umag;
      M[8+i]  = f[i] * fmag;
      M[12+i] = 0.0;
    }
    M[15] = 1.0;
    
    for(i=0; i<3; ++i) {
      var x = 0;
      for(var j=0; j<3; ++j) {
        x += M[4*j+i] * eye[j];
      }
      M[4*i+3] = x;
    }
  };
  

  //Begins drawing to the main screen
  Render.beginDraw = function() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
		gl.viewport(0, 0, Render.width, Render.height);
		
		//Set up perspective matrix
		Render.perspective(Render.fov_y, Render.width / Render.height, Render.z_near, Render.z_far);
		
		var bg = Render.background_color;
		
		gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
  };

  //Draws a sprite
  Render.drawSprite = function(spritenum, position, options) {
  };

})();
