"use strict";

var Render = {};

(function(){


  var canvas = document.getElementById("renderCanvas");
  
  

  Render.init = function(cb) {
    	//Initialize WebGL
		Game.canvas = document.getElementById("gameCanvas");
		var gl;
		try {
			gl = Game.canvas.getContext("experimental-webgl");
		}
		catch(e) {
		  App.crashNoWebGL();
		}
		
		if(!gl) {
      App.crashNoWebGL();
		}
		Game.gl = gl;

		//Get extensions
		Game.EXT_FPTex = gl.getExtension("OES_texture_float");
		Game.EXT_StdDeriv = gl.getExtension("OES_standard_derivatives");
		Game.EXT_VertexArray = gl.getExtension("OES_vertex_array_object");	

  };
  
  Render.deinit = function(cb) {
    cb(null);
  };
  
  //Resize the canvas
  Render.resize = function() {
  
  };

	/*
	


	resize : function() {
		Game.canvas.width = window.innerWidth;
		Game.canvas.height = window.innerHeight;
	
		Game.width = Game.canvas.width;
		Game.height = Game.canvas.height;
	
		var appPanel = document.getElementById("gamePane");
		appPanel.width = Game.canvas.width;
		appPanel.height = Game.canvas.height;
	},



		var gl = Game.gl;
	
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
		gl.viewport(0, 0, Game.width, Game.height);
		gl.clearColor(0.3, 0.5, 0.9, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);


	
	getShader: function(url) {
		var gl = Game.gl, script = Loader.data[url];
		if(!script) {
			App.crash("Error requesting document: " + url);
    }

		//Extract file extension
		var ext = url.split('.');
		ext = ext[ext.length-1];

		var shader;
		if(ext == 'vs') {
			shader = gl.createShader(gl.VERTEX_SHADER);
		}
		else if(ext == 'fs') {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		}
		else {
			App.crash("Invalid file extension for shader " + url);
		}

		gl.shaderSource(shader, script);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			App.crash("Error compling shader: " + url + ", Message: " + gl.getShaderInfoLog(shader));
		}
		return shader;
	},

	getProgram: function(fs_url, vs_url) {
		var gl = Game.gl, 
		    fs = Loader.getShader(fs_url),
		    vs = Loader.getShader(vs_url),
        prog = gl.createProgram();
    
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			App.crash("Shader link error (" + fs_url +", " + vs_url + "): Could not link shaders");
		}

		return prog;
	},

	getProgramFromSource: function(fs_source, vs_source) {
		var gl = Game.gl, vshader, fshader, prog;

		vshader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vshader, vs_source);
		gl.compileShader(vshader);		
		if(!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)) {
			App.crash("Error compling shader:\n" + vs_source + "\n\nMessage: " + gl.getShaderInfoLog(vshader));
		}		
	
		fshader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fshader, fs_source);
		gl.compileShader(fshader);
		if(!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
			App.crash("Error compling shader:\n" + fs_source + "\n\nMessage: " + gl.getShaderInfoLog(fshader));
		}
	
		prog = gl.createProgram();
		gl.attachShader(prog, vshader);
		gl.attachShader(prog, fshader);
		gl.linkProgram(prog);
		if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			App.crash("Shader link error for Frag shader:\n" + fs_source + "\n\nVert shader:\n" + vs_source);
		}

		return prog;
	},

	getTexture: function(url) {
		var gl = Game.gl, 
        img = Loader.data[url];
		if(!img) {
			App.crash("Could not load image " + url);
		}

		var gl = Game.gl, 
			tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		return tex;	
	}

*/


})();
