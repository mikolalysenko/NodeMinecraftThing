var linalg = require('./linalg.js');

//Sprite vertex shader
var VERTEX_SHADER = 
'attribute vec2 vertex_position;\n\
uniform vec4 sprite_rect;\n\
uniform mat3 sprite_xform;\n\
uniform vec4 position;\n\
varying vec2 tex_coord;\n\
void main(void) {\n\
  vec3 sprite_position = sprite_xform * vec3(vertex_position, 1);\n\
	gl_Position = position + vec4(sprite_position.xy/sprite_position.z, 0, 0);\n\
	tex_coord = vertex_position * (sprite_rect.zw - sprite_rect.xy) + sprite_rect.xy;\n\
}';
		
//Sprite frag shader
var FRAGMENT_SHADER =
'precision mediump float;\n\
uniform sampler2D spritesheet;\n\
uniform vec3 color;\n\
varying vec2 tex_coord;\n\
void main(void) {\n\
  vec4 fcolor = texture2D(spritesheet, tex_coord);\n\
  if(fcolor.a < 1.0) {\n\
    discard;\n\
  }\n\
  else {\n\
    gl_FragColor = vec4(fcolor.xyz*color, 1.0);\n\
  }\n\
}';


//Sprite rendering pass
function SpritePass(engine, texture) {
  this.engine = engine;
  this.name = 'sprites';
  this.texture = null;
  this.shader = null;
  this.vertex_buffer = null;
  
  var spritesheet = this;
  engine.loader.listenFinished(function() {
  
    spritesheet.shader = engine.render.genShader({ 
      vert_src      : VERTEX_SHADER,
      frag_src      : FRAGMENT_SHADER,
      
      attribs       : { 'vertex_position' : '2f', },
      
      uniforms      : { 'spritesheet'   : '1i', 
                        'sprite_rect'   : '4f',
                        'sprite_xform'  : 'Matrix3f',
                        'color'         : '3f',
                        'position'      : '4f',
                      },
    });
  
    //Create vertex buffer
    spritesheet.vertex_buffer = engine.render.genBuffer([
       0, 0,
       0, 1,
       1, 0,
       1, 1,
    ]);
    
    //Create texture
    spritesheet.texture = engine.render.genTexture(texture);
  });
}


SpritePass.prototype.begin = function(time, render) {
  var gl       = render.gl,
      shader   = this.shader,
      attribs  = shader.attribs,
      uniforms = shader.uniforms,
      spritesheet = this;
      
  gl.useProgram(shader);
  
  attribs.vertex_position.pointer(spritesheet.vertex_buffer);
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, spritesheet.texture.texture);
  shader.uniforms.spritesheet.set(0);
  
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  
  gl.disable(gl.CULL_FACE);
}

SpritePass.prototype.end = function(render) {
  var gl = this.engine.render.gl;
  gl.disable(gl.BLEND);
}

//Draws a sprite
SpritePass.prototype.drawSprite = function(position, options) {

  if(!options) {
    options = {};
  }
  
  function checkDefault(x, d) {
    var r = options[x];
    return r ? r : d;
  }
    
  var spritesheet = this,
      render    = this.engine.render,
      gl        = render.gl,
      shader    = spritesheet.shader,
      uniforms  = shader.uniforms,
      w         = spritesheet.texture.width,
      h         = spritesheet.texture.height,
      rect      = checkDefault('rect', [0,0,1,1]),
      sp_w      = rect[2] - rect[0],
      sp_h      = rect[3] - rect[1],
      center    = checkDefault('center', [0.5*sp_w+rect[0], 0.5*sp_h+rect[1]]),
      scale     = checkDefault('scale', 1.0) * sp_h / 16.0,
      aspect    = checkDefault('aspect', sp_w / sp_h),
      theta     = checkDefault('rotation', 0),
      flip      = checkDefault('flip', false),
      color     = checkDefault('color', [1,1,1]),
      hg_pos    = linalg.xform4(render.clip_matrix, 
                    [position[0], position[1], position[2], 1]);
  
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
  xform[6] = -(xform[0]*(center[0]-rect[0])/sp_w + xform[3]*(center[1]-rect[1])/sp_h);
  xform[7] = -(xform[1]*(center[0]-rect[0])/sp_w + xform[4]*(center[1]-rect[1])/sp_h);
  uniforms.sprite_xform.set(false, xform);

  //Set up sprite rectangle
  uniforms.sprite_rect.set(rect[0]/w, rect[1]/h, rect[2]/w, rect[3]/h);
  
  //Set color
  uniforms.color.set(color[0], color[1], color[2]);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};


exports.SpritePass = SpritePass;
