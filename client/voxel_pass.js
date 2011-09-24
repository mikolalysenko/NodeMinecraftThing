var VERTEX_SIZE = 5;

var VERTEX_SHADER = 
'attribute vec3 vertex_position;\n\
attribute vec2 vertex_texture;\n\
uniform mat4 clip_matrix;\n\
varying vec2 texture_coord;\n\
varying vec2 texture_tile;\n\
void main(void) {\n\
	gl_Position   = clip_matrix * vec4(vertex_position, 1);\n\
	texture_coord = floor(vertex_texture);\n\
	texture_tile  = fract(vertex_texture)*256.0;\n\
}';

var FRAGMENT_SHADER = 
'precision mediump float;\n\
uniform sampler2D tile_sampler;\n\
uniform vec2 tile_size;\n\
varying vec2 texture_coord;\n\
varying vec2 texture_tile;\n\
void main(void) {\n\
  vec2 tc = (fract(texture_coord) + texture_tile) * tile_size;\n\
	gl_FragColor = texture2D(tile_sampler, tc);\n\
}';

var prog = null;

function VoxelPass(engine, texture) {
  this.engine = engine;
  this.name = 'voxels';
  this.texture = null;
  this.shader = null;
  this.tile_x = 16;
  this.tile_y = 16;
  
  var voxels = this;
  engine.loader.listenFinished(function() {
    voxels.shader = engine.render.genShader({
      frag_src      : FRAGMENT_SHADER, 
      vert_src      : VERTEX_SHADER,
      attribs       : { 'vertex_position' : '3f', 
                        'vertex_texture'  : '2f',
                      },
      uniforms      : { 'clip_matrix'     : 'Matrix4f',
                        'tile_sampler'    : '1i',
                        'tile_size'       : '2f',
                      },
    });
  
    voxels.texture = engine.render.genTexture(texture);

    if(!voxels.texture) {
      throw Error("Missing voxel tile texture: " + texture);
    }
  });
}

VoxelPass.prototype.begin = function(time, render) {
  var gl        = render.gl,
      shader    = this.shader,
      uniforms  = shader.uniforms,
      attribs   = shader.attribs,
      voxels    = this;
  
  gl.useProgram(voxels.shader);
  uniforms.clip_matrix.set(false, render.clip_matrix);
  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, voxels.texture.texture);
  uniforms.tile_sampler.set(0);

  uniforms.tile_size.set(
    voxels.tile_x / voxels.texture.width,
    voxels.tile_y / voxels.texture.height);
    
  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
};

VoxelPass.prototype.end = function(render) {
};

//Voxel cell object
function VoxelCell(render, cx, cy, cz) {
  this.render = render;
  this.cx = cx;
  this.cy = cy;
  this.cz = cz;
  this.ranges = new Array(7);
  this.vbuffer = render.gl.createBuffer();
};

//Updates vertices
VoxelCell.prototype.update = function(vertices) {
  var gl = this.render.gl;
  this.ranges[0] = 0;
  for(var i=0; i<6; ++i) {
    this.ranges[i+1] = this.ranges[i] + (vertices[i].length / VERTEX_SIZE);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 
    new Float32Array([].concat(vertices[0], vertices[1], vertices[2], vertices[3], vertices[4], vertices[5])),
    gl.DYNAMIC_DRAW);
};

//Draws a voxel cell
VoxelCell.prototype.draw = function(pass) {
  
  //Set up attributes and uniforms
  var shader    = pass.shader,
      attribs   = shader.attribs,
      gl        = this.render.gl;

  attribs.vertex_position.pointer(this.vbuffer, 4*VERTEX_SIZE, 0);
  attribs.vertex_texture.pointer(this.vbuffer, 4*VERTEX_SIZE, 4*3);
  
  //FIXME: Only draw visible sides of cube
  gl.drawArrays(gl.TRIANGLES, 0, this.ranges[6]);
};

//Release voxel cell resources
VoxelCell.prototype.release = function() {
  this.render.gl.deleteBuffer(this.vbuffer);
  this.vbuffer = null;
};


exports.VoxelPass = VoxelPass;
exports.VoxelCell = VoxelCell;

