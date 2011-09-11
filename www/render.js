"use strict";

var Render = {

  //Background color for the renderer
  background_color : [ 0.3, 0.5, 0.9, 1.0 ],
};

(function(){

  //Private variables for rendering context
  var canvas = document.getElementById("renderCanvas"),
      gl = null,
      EXT_FPTex,
      EXT_StdDeriv,
      EXT_VertexArray;

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
		
		//Save gl object
		Render.gl = gl;

		//Get extensions
		EXT_FPTex = gl.getExtension("OES_texture_float");
		EXT_StdDeriv = gl.getExtension("OES_standard_derivatives");
		EXT_VertexArray = gl.getExtension("OES_vertex_array_object");	
		
		//Done
		cb(null);
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
  
  
  //Creates a shader object
  // frag_src = fragment shader source/url
  // vert_src = vertex shader srouce/url
  //  options = if explicit_frag is set, don't retrieve frag_src, instead just use frag_src as shader.  Similarly for explicit_vert.
  //  cb = Continuation
  Render.getShader = function(frag_src, vert_src, options, cb) {
  
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

		cb(prog);
  };
  
  //Retrieves a texture
  function getTexture(url, options, cb) {
    var img = Loader.data[url];
		if(!img) {
			App.crash("Could not load image " + url);
			return;
		}

		var gl = Game.gl, 
			tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		cb(tex);
  };

  //Begins drawing to the main screen
  Render.beginDraw = function() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
		gl.viewport(0, 0, Render.width, Render.height);
		
		var bg = Render.background_color;
		
		gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
  };

})();
