var linalg        = require('./linalg.js'),
    EventEmitter  = require('events').EventEmitter;

//---------------------------------------------------
// Game engine stuff
//---------------------------------------------------

function RenderGL(canvas) {

  //Basic stuff
  this.engine   = null;
  this.canvas   = canvas;
  this.emitter  = new EventEmitter();
  this.gl       = null;  
  
  //Extensions
  this.EXT_FPTex        = null;
  this.EXT_StdDeriv     = null;
  this.EXT_VertexArray  = null;
  
  //Texturing
  this.textures = {};
  
  //Camera
  this.view_matrix  = null;
  this.proj_matrix  = null;
  this.clip_matrix  = null;
  
  //Rendering passes
  this.passes       = [ ];
  this.activated    = false;
  this.loop_func    = null;
}

RenderGL.prototype.init = function(engine) {

  if(typeof(Float32Array) === "undefined") {
    throw Error("WebGL not supported");
  }

  this.engine = engine;

  try {
    this.gl = this.canvas.getContext("experimental-webgl");
      
    //Camera
    this.view_matrix  = new Float32Array(16);
    this.proj_matrix  = new Float32Array(16);
    this.clip_matrix  = new Float32Array(16);    
  }
  catch(err) {
    throw Error("WebGL not supported");
  }
  if(!this.gl) {
    throw Error("WebGL not supported");
  }

  this.EXT_FPTex        = this.gl.getExtension("OES_texture_float");
  this.EXT_StdDeriv     = this.gl.getExtension("OES_standard_derivatives");
  this.EXT_VertexArray  = this.gl.getExtension("OES_vertex_array_object");

  this.emitter.emit('init');
}

RenderGL.prototype.deinit = function() {
  this.setActive(false);
  this.emitter.emit('deinit');
  this.emitter.removeAllListeners();
}

//---------------------------------------------------
// Factory methods
//---------------------------------------------------

//Creates a shader object
//  options = 
//    vert_src - Vertex shader source (optional)  \ -Must specify at least one
//    vert_url - Vertex shader url (optional)     /
//    frag_src - Fragment shader source (optional) \ -Must specify at least one
//    frag_url - Fragment shader source (optional  /
//    attribs -  A set of attribute locations + types for the shader
//    uniforms - Uniform locations + types
//
RenderGL.prototype.genShader = function(options) {

  var gl = this.gl, engine = this.engine;

  //Retrieve program source code
  var vert_src = options.vert_src,
      vert_url = options.vert_url,
      frag_src = options.frag_src,
      frag_url = options.frag_url;
  if(!vert_src) {
    if(vert_url) {
      throw Error("Missing vertex shader!");
    }
    vert_src = this.engine.loader.data[vert_url];
    if(!vert_src) {
      throw Error("Could not find vertex shader: " + vert_url);
    }
  }
  if(!vert_url) {
    vert_url = vert_src;
  }
  if(!frag_src) {
    if(!frag_url) {
      throw Error("Missing fragment shader!");
    }  
    frag_src = Loader.data[frag_url];
    if(!frag_src) {
      throw Error("Could not find fragment shader: " + frag_url);
    }
  }
  if(!frag_url) {
    frag_url = frag_src;
  }

  
  //Helper method to create a shader object
  var errors = "";
  var makeShaderObject = function(type, src, url) {
    var shader_obj = gl.createShader(type == 'vs' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    
    gl.shaderSource(shader_obj, src);
    gl.compileShader(shader_obj);
    
	  if(!gl.getShaderParameter(shader_obj, gl.COMPILE_STATUS)) {
	    errors += "Error compling shader: \n\n" + url + 
	        "\n\nReason: " + gl.getShaderInfoLog(shader_obj) + "\n";
      return null;
	  }
	  return shader_obj;
  };
  
  var frag_shader = makeShaderObject('fs', frag_src, frag_url),
      vert_shader = makeShaderObject('vs', vert_src, vert_url);
            
  if(!frag_shader || !vert_shader) {
    throw Error("Shader compile error!\n\n" + errors);
  }
  
  var prog = gl.createProgram();
  
  gl.attachShader(prog, vert_shader);
	gl.attachShader(prog, frag_shader);
	gl.linkProgram(prog);
	
	if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		throw Error("Shader link error (" + frag_url +", " + vs_url + "): Could not link shaders");
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
	  throw Error("Error loading uniforms/attributes: \n\n"  + err_str + "\n\nIn vertex shader:\n" + vert_url + "\n\nFrag shader: " + frag_url);
	  return null;
	}
	return prog;
}

//Generates a buffer
RenderGL.prototype.genBuffer = function(data) {
  var gl = this.gl,
      buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buffer;
}

//Generates a texture for a given image
RenderGL.prototype.genTexture = function(url) {
  if(url in this.textures) {
    return this.textures[url];
  }

  var gl = this.gl, 
      engine = this.engine,
      img = engine.loader.data[url];
  
  if(!img) {
    throw Error("Invalid image url: " + url);
  }
  
  var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
  //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  this.textures[url] = { 'width':img.width, 'height':img.height, 'texture':tex };
  
  return this.textures[url];
}



//---------------------------------------------------
// Camera methods
//---------------------------------------------------

//Sets projection matrix to a perspective matrix
RenderGL.prototype.perspective = function(fov_y, aspect, z_near, z_far) {

  var proj_matrix = this.proj_matrix;

  for(var i=0; i<16; ++i) {
    proj_matrix[i] = 0;
  }
  
  var f = 1.0/Math.tan(0.5 * fov_y);
  proj_matrix[0]  = f / aspect;
  proj_matrix[5]  = f;
  proj_matrix[10] = (z_far + z_near) / (z_near - z_far);
  proj_matrix[11] = (2.0 * z_far * z_near) / (z_near - z_far);
  proj_matrix[14] = -1;
  
  linalg.mmult4(this.proj_matrix, this.view_matrix, this.clip_matrix);
}

//Sets camera to look at a particular target
RenderGL.prototype.lookAt = function(eye, center, u) {
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
    f[0]*u[1] - f[1]*u[0] ], smag = 0.0;
    
  for(i=0; i<3; ++i) {
    smag += s[i]*s[i];
  }
  smag = 1.0/Math.sqrt(smag);

  var M = this.view_matrix;
  for(i=0; i<3; ++i) {
    M[4*i+0] = s[i] * smag;
    M[4*i+1] = u[i] * umag;
    M[4*i+2] = f[i] * fmag;
    M[4*i+3] = 0.0;
  }
  M[15] = 1.0;
  
  for(i=0; i<3; ++i) {
    var x = 0;
    for(var j=0; j<3; ++j) {
      x += M[4*j+i] * eye[j];
    }
    M[12+i] = -x;
  }
  
  linalg.mmult4(this.proj_matrix, this.view_matrix, this.clip_matrix);
}


//---------------------------------------------------
// Activates the renderer
//---------------------------------------------------

var nextFrame = 
      window.requestAnimationFrame       || 
      window.webkitRequestAnimationFrame || 
      window.mozRequestAnimationFrame    || 
      window.oRequestAnimationFrame      || 
      window.msRequestAnimationFrame     || 
      function(callback, element){
        window.setTimeout(function(){
          callback(Date.now());
        }, 16);
      };

//Activates the renderer
RenderGL.prototype.setActive = function(active) {

  //Set state variable
  this.activated = active;
  if(!active) {
    this.emitter.emit('deactivated');
    return;
  }
  
  this.emitter.emit('activated');
  
  //Set up loop function
  var render = this;
  this.loop_func = function(time) {
    if(!render.activated) {
      return;
    }
    
    //Compute frame tween time
    var t = 1 - (render.engine.last_tick - time) / render.engine.game_module.tick_rate;
    if(t < 0.0) {
      t = 0.0;
    }
    if(t > 1.0) {
      t = 1.0;
    }
    
    render.emitter.emit('frame_begin');
    
    for(var i=0; i<render.passes.length; ++i) {
      var pass = render.passes[i];
      pass.begin(t, render);
      render.emitter.emit('pass_' + pass.name, t, render, pass);
      pass.end(render);
    }
    
    render.emitter.emit('frame_end');
    
    nextFrame(render.loop_func);
  };
  
  //Bootstrap the client
  nextFrame(render.loop_func);
};


//Export renderer
exports.RenderGL = RenderGL;
