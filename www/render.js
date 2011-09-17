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
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
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
      proj_matrix = new Float32Array(16),
      clip_matrix = new Float32Array(16);
  
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
    
    linalg.mmult4(view_matrix, proj_matrix, clip_matrix);
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
    
    linalg.mmult4(view_matrix, proj_matrix, clip_matrix);
  };

//---------------------------------------------------
// State commands
//---------------------------------------------------

  //Rendering state variables
  var render_state = 'none',
    
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
    render_state = 'none';
  
    //Reset opengl state  
  	var bg = Render.background_color;  
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
	  gl.viewport(0, 0, Render.width, Render.height);
	  gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
	  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	  gl.enable(gl.DEPTH_TEST);
	  gl.disable(gl.CULL_FACE);
	  gl.disable(gl.BLEND);
	
	  //Set up intermediate variables
	  var i;
	  for(i=0; i<16; ++i) {
      view_matrix[i]    = 0.0;
    }
    for(i=0; i<4; ++i) {
      view_matrix[5*i]  = 1.0;
    }
	  Render.perspective(Render.fov_y, Render.width / Render.height, Render.z_near, Render.z_far);
	
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
'attribute vec2 vertex_position;\n\
uniform vec4 sprite_rect;\n\
uniform mat3 sprite_xform;\n\
uniform vec4 position;\n\
varying vec2 tex_coord;\n\
void main(void) {\n\
  vec3 sprite_position = sprite_xform * vec3(vertex_position, 1);\n\
	gl_Position = position + vec4(sprite_position.xy/sprite_position.z, 0, 0);\n\
	tex_coord = vertex_position * (sprite_rect.zw - sprite_rect.xy) + sprite_rect.xy;\n\
}',
		
//Sprite frag shader
'precision mediump float;\n\
uniform sampler2D spritesheet;\n\
uniform vec4 color;\n\
varying vec2 tex_coord;\n\
void main(void) {\n\
	gl_FragColor = texture2D(spritesheet, tex_coord) * color;\n\
}',

  //Options
  { explicit_frag : true, 
    explicit_vert : true,
    
    attribs       : { 'vertex_position' : '2f', },
    
    uniforms      : { 'spritesheet'   : '1i', 
                      'sprite_rect'   : '4f',
                      'sprite_xform'  : 'Matrix3f',
                      'color'         : '4f',
                      'position'      : '4f',
                    },
  });
  
    //Create vertex buffer
    spritesheet.vertex_buffer = Render.genBuffer([
       0, 0,
       0, 1,
       1, 0,
       1, 1,
    ]);
    
    //Create texture
    var tex = textures['spritesheet.png'];
    spritesheet.texture = tex.texture;
    spritesheet.width   = tex.width;
    spritesheet.height  = tex.height;
  });


  //Sets rendering context to draw from the sprite sheet
  function beginSprites() {
    if(render_state === 'sprites') {
      return;
    }
    
    var shader   = spritesheet.shader,
        attribs  = shader.attribs,
        uniforms = shader.uniforms;
        
    gl.useProgram(shader);
    
    attribs.vertex_position.pointer(spritesheet.vertex_buffer);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, spritesheet.texture);
    shader.uniforms.spritesheet.set(gl.TEXTURE0);
    
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    render_state = 'none';
  };

  function checkDefault(x, d) {
    if(typeof(x) !== "undefined") {
      return x;
    }
    return d;
  }


  //Draws a sprite
  Render.drawSprite = function(position, options) {
    beginSprites();
    
    if(!options) {
      options = {};
    }
    
    var shader    = spritesheet.shader,
        uniforms  = shader.uniforms,
        w         = spritesheet.width,
        h         = spritesheet.height,
        rect      = checkDefault(options.rect, [0,0,1,1]),
        center    = checkDefault(options.center, [0, 0]),
        scale     = checkDefault(options.scale, 1.0),
        aspect    = checkDefault(options.aspect, (rect[2]-rect[0])/(rect[3]-rect[1])),
        theta     = checkDefault(options.rotation, 0),
        flip      = checkDefault(options.flip, false),
        color     = checkDefault(options.color, [1,1,1,1]),
        hg_pos    = linalg.xform4(clip_matrix, [position[0], position[1], position[2], 1]);
    
    //Compute screen position
    uniforms.position.set(hg_pos[0], hg_pos[1], hg_pos[2], hg_pos[3]);
    
    //Compute sprite transformation
    var xs = scale * aspect * (flip ? -1 : 1),
        ys = scale,
        cc = Math.cos(theta),
        ss = Math.sqrt(1.0 - cc*cc),
        xform = [ xs*cc, -ys*ss, 0.0,
                 -xs*ss, -ys*cc, 0.0,
                  0.0, 0.0, 1.0 ];
    xform[6] = -(xform[0]*center[0]/rect[2] + xform[3]*center[1]/rect[3]);
    xform[7] = -(xform[1]*center[0]/rect[2] + xform[4]*center[1]/rect[3]);
    uniforms.sprite_xform.set(false, xform);

    //Set up sprite rectangle
    uniforms.sprite_rect.set(rect[0]/w, rect[1]/h, rect[2]/w, rect[3]/h);
    
    //Set color
    uniforms.color.set(color[0], color[1], color[2], color[3]);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };



//---------------------------------------------------
// Voxel commands
//---------------------------------------------------

  var voxels = {
      texture : null,
      shader  : null,
      VERTEX_SIZE : 3,
    };

//Callback for loading voxels    
Loader.listenFinished(function() {
voxels.shader = Render.genShader(
//Voxel vertex shader
'attribute vec3 vertex_position;\n\
uniform mat4 clip_matrix;\n\
void main(void) {\n\
	gl_Position = clip_matrix * vec4(vertex_position, 1);\n\
}',
		
//Sprite frag shader
'precision mediump float;\n\
void main(void) {\n\
	gl_FragColor = vec4(1,1,1,1);\n\
}',

//Options
{ explicit_frag : true, 
  explicit_vert : true,
  
  attribs       : { 'vertex_position' : '3f', 
                  },
  
  uniforms      : { 'clip_matrix'     : 'Matrix4f',
                  },
});
  
voxels.texture = textures['terrain.png'];
});

  //Set up variables for voxels
  function beginVoxels() {
    if(render_state == 'voxels') {
      return;
    }
    
    //Set up voxel specific stuff here
    gl.useProgram(voxels.shader);
    voxels.shader.uniforms.clip_matrix.set(false, clip_matrix);

    
    render_state = 'voxels';
  };
  
  //Voxel cell object
  function VoxelCell(cx, cy, cz) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.ranges = new Array(7);
    this.vbuffer = gl.createBuffer();
  };
  
  //Updates vertices
  VoxelCell.prototype.update = function(vertices) {
    this.ranges[0] = 0;
    for(var i=0; i<6; ++i) {
      this.ranges[i+1] = this.ranges[i] + (vertices[i].length / voxels.VERTEX_SIZE);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
      new Float32Array([].concat(vertices[0], vertices[1], vertices[2], vertices[3], vertices[4], vertices[5])),
      gl.DYNAMIC_DRAW);
  };

  //Draws a voxel cell
  VoxelCell.prototype.draw = function() {
    //FIXME: Cull out invisible cells
    beginVoxels();

    //Set up attributes and uniforms
    var shader    = voxels.shader,
        attribs   = shader.attribs;

    gl.bindBuffer(this.vbuffer);
    attribs.vertex_position.pointer(this.vbuffer);
    
    //FIXME: Only draw visible sides of cube
    gl.drawArrays(gl.TRIANGLES, 0, this.ranges[6]);
  };
  
  //Release voxel cell resources
  VoxelCell.prototype.release = function() {
    gl.deleteBuffer(this.vbuffer);
  };
  
  //Creates a voxel cell
  Render.createVoxelCell = function(cx, cy, cz, vertices) {
    var cell = new VoxelCell(cx, cy, cz);
    cell.update(vertices);
    return cell;
  };

})();
