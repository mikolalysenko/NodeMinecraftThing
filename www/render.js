"use strict";

var Render = {

  //Canvas and GL objects
  canvas : document.getElementById("renderCanvas"),
  gl : null,

  //Background color for the renderer
  background_color : [ 0.3, 0.5, 0.9, 1.0 ],
  
  //Default perspective parameters  
  fov_y   : Math.PI/4.0,
  z_near  : 1.0,
  z_far   : 1000.0,
  
  textures : {},
};

(function(){

//Compatibility fixes
if(typeof(Float32Array) == "undefined") {
  var Float32Array = Array;
}
if(typeof(Uint16Array) == "undefined") {
  var Uint16Array = Array;
}

//---------------------------------------------------
// Initialization
//---------------------------------------------------
  //Private variables for rendering context
  var canvas = Render.canvas,
      gl = null,
      EXT_FPTex,
      EXT_StdDeriv,
      EXT_VertexArray,
      textures = Render.textures;

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
    
  //Shutdown renderer
  Render.deinit = function(cb) {
    Render.clearDraw();
    cb(null);
  };
  
//---------------------------------------------------
// Factory methods
//---------------------------------------------------

  //Creates a shader object
  // vert_src = vertex shader srouce/url
  // frag_src = fragment shader source/url
  //  options = 
  //    explicit_frag - If set, frag_src is actually the source code, not a URL
  //    explicit_vert - If set, vert_src " "
  //    attribs -  A set of attribute locations + types for the shader
  //    uniforms - Uniform locations + types
  Render.genShader = function(vert_src, frag_src, options) {
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
		    ErrorState.postError("Error compling shader: \n\n" + url + 
		        "\n\nReason: " + gl.getShaderInfoLog(shader_obj));
        return null;
		  }
		  return shader_obj;
    };
    
    var frag_shader = makeShaderObject('fs', frag_src, frag_url),
        vert_shader = makeShaderObject('vs', vert_src, vert_url);
        
    if(!frag_shader || !vert_shader) {
      App.crash("Shader compile error!");
      return;
    }
    
    var prog = gl.createProgram();
    
    gl.attachShader(prog, vert_shader);
		gl.attachShader(prog, frag_shader);
		gl.linkProgram(prog);
		
		if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			App.crash("Shader link error (" + frag_url +", " + vs_url + "): Could not link shaders");
		}
		
		gl.useProgram(prog);
		
		//Add attributes/uniforms to shader
		var missing_attribs = '', missing_uniforms = '';
		
		if('attribs' in options) {
		  var attribs = {}, names = options['attribs'];
		  for(var n in names) {
		    var t = names[n],
		        loc = gl.getAttribLocation(prog, n);
		    if(loc < 0) {
		      missing_attribs += n + '\n';
		    }
		    else {
		      (function(loc, size) {		       
    		    attribs[n] = {
    		      'location': loc,
    		      'pointer': function(buffer, stride, offset) {
    		        gl.enableVertexAttribArray(loc);
    		        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    		        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, (stride ? stride : 0), (offset ? offset : 0));
    		      },
    		    };
    		  })(loc, parseInt(t.charAt(0)));
		    }
		  }
		  prog.attribs = attribs;
		}
		
		var argtypes = {
		  'i' : 'Int',
		  'f' : 'Float',
		};
		
		if('uniforms' in options) {
		  var uniforms = {}, names = options['uniforms'];
		  for(var n in names) {
		    var t = names[n],
		        loc = gl.getUniformLocation(prog, n);
		    if(!loc) {
		      missing_uniforms += n + '\n';
		    }
		    else {
		      (function(loc,size) {
		        var src;
		        if(t.charAt(0) === 'M') {
		          src = '(function(transpose, mat) { gl.uniform' + t + 'v(loc,transpose,mat); })';
		        }
		        else {
		          src = '(function() { gl.uniform'+t+'v(loc,new '+argtypes[t.charAt(1)]+'32Array(arguments)); } )';
		        }
		        uniforms[n] = {
		          'location':  loc,
		          'set': eval(src),
            };
          })(loc)
		    }
		  }
		  prog.uniforms = uniforms;
		}
		
		//Handle errors here
		var err_str = '';
		if(missing_attribs.length > 0) {
		  err_str += 'Missing attributes:\n' + missing_attribs + '\n';
		}
		if(missing_uniforms.length > 0) {
		  err_str += 'Missing uniforms:\n' + missing_uniforms + '\n';
		}
		if(err_str.length > 0) {
		  App.crash("Error loading uniforms/attributes: \n\n"  + err_str + "\n\nIn vertex shader:\n" + vert_url + "\n\nFrag shader: " + frag_url);
		  return null;
		}
		return prog;
  };
  
  //Generates a buffer
  Render.genBuffer = function(data) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
  }
  
  //Generates a texture for a given image once it is loaded
  Loader.emitter.on('image', function(url, img) {
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    textures[url] = { 'width':img.width, 'height':img.height, 'texture':tex };
  });
  
//---------------------------------------------------
// Events
//---------------------------------------------------
  
  //Resize the canvas
  Render.resize = function() {
  
		Render.width  = canvas.width  = window.innerWidth;
		Render.height = canvas.height = window.innerHeight;
	
		var appPanel    = document.getElementById("gamePane");
		appPanel.width  = canvas.width;
		appPanel.height = canvas.height;
  };
  
  
//---------------------------------------------------
// Configuration
//---------------------------------------------------
  var view_matrix = new Float32Array(16),
      proj_matrix = new Float32Array(16);
  
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

//---------------------------------------------------
// State commands
//---------------------------------------------------

  //Rendering state variables
  var state = {
      using_sprites : false,
    },
    
    nextFrame = 
      window.requestAnimationFrame       || 
      window.webkitRequestAnimationFrame || 
      window.mozRequestAnimationFrame    || 
      window.oRequestAnimationFrame      || 
      window.msRequestAnimationFrame     || 
      function(callback, element){
        window.setTimeout(function(){
          callback(Date.now());
        }, 16);
      },
      
    draw_func = null;
  
  //Secret looping function, don't ever call this or stuff will break
  Render.__loop_func__ = function(time) {
    if(!draw_func) {
      return;
    }
  
    //Clear rendering state
    state.using_sprites = false;
  
    //Reset opengl state  
  	var bg = Render.background_color;  
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
	  gl.viewport(0, 0, Render.width, Render.height);
	  gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
	  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	  //gl.disable(gl.DEPTH_TEST);
	  //gl.disable(gl.CULL_FACE);
	
	  //Set up intermediate variables
	  //Render.perspective(Render.fov_y, Render.width / Render.height, Render.z_near, Render.z_far);
	
	  //Perform client side drawing
	  draw_func(time);
	  
	  //Loop
    nextFrame(Render.__loop_func__, Render.canvas);
  };

  //Schedules a draw event to run each time the form is redrawn
  Render.bindDraw = function(cb) {
    draw_func = cb;
    nextFrame(Render.__loop_func__, Render.canvas);
  };
  
  //Clears out the draw listener
  Render.clearDraw = function() {
    draw_func = null;
  }


//---------------------------------------------------
// Sprite commands
//---------------------------------------------------

  var spritesheet = {
        texture       : null,
        shader        : null,
        vertex_buffer : null,
      };

  //Initialize sprite sheet
  Loader.listenFinished(function () {
  		spritesheet.shader = Render.genShader(

//Sprite vertex shader
'attribute vec3 pos;\n\
\n\
void main(void) {\n\
	gl_Position = vec4(pos.x, pos.y, pos.z, 1.0);\n\
}',
		
//Sprite frag shader
'void main(void) {\n\
	gl_FragColor = vec4(1.0,1.0,1.0,1.0);\n\
}',

  //Options
  { explicit_frag : true, 
    explicit_vert : true,
    attribs       : { 'pos' : '3f', },
    uniforms      : { /* 'spritesheet' : '1i', 'sprite_rect' : '4f' */ },
  });
  
    //Create vertex buffer
    spritesheet.vertex_buffer = Render.genBuffer([
       0.0,  1.0, 0.0,
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
    ]);
    
    //Create texture
    var tex = textures['spritesheet.png'];
    spritesheet.texture = tex.texture;
    spritesheet.width   = tex.width;
    spritesheet.height  = tex.height;
  });


  //Sets rendering context to draw from the sprite sheet
  function beginSprites() {
    if(state.using_sprites) {
      return;
    }
    
    var shader   = spritesheet.shader,
        attribs  = shader.attribs,
        uniforms = shader.uniforms;
        
    gl.useProgram(shader);
    
    shader.attribs.v_tex_coord.pointer(spritesheet.vertex_buffer);
    
    /*
    gl.enable(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, spritesheet.texture);
    shader.uniforms.spritesheet.set(0);
    */
    
    state.using_sprites = true;
  };


  //Draws a sprite
  Render.drawSprite = function(position, rect, options) {
    //beginSprites();
    
    var shader    = spritesheet.shader,
        uniforms  = shader.uniforms,
        w         = spritesheet.width,
        h         = spritesheet.height;

    /*        
    uniforms.position.set(position[0], position[1], position[2]);
    uniforms.sprite_rect.set(rect[0]/w, rect[1]/h, rect[2]/w, rect[3]/h);
    */
    
    gl.useProgram(shader);
    
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, spritesheet.vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 0,
      0, 1, 0,
      1, 0, 0
    ]), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

})();
