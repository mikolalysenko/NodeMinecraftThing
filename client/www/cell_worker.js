"use strict";

//Import files
importScripts('/browserify.js');
var Voxels = require('./voxels.js'),
    EventEmitter = require('events').EventEmitter,
    voxel_types = require('./client.js').voxel_types,
    TEX_SCALE = 1.0/256.0;

//Set up stuff
var emitter = new EventEmitter(),
    voxel_set = new Voxels.ChunkSet(),
    worker_interval = setInterval(makeCells, 16),
    dirty_cells = {},
    
    CHUNK_X = Voxels.CHUNK_X,
    CHUNK_Y = Voxels.CHUNK_Y,
    CHUNK_Z = Voxels.CHUNK_Z,
    
    CELL_SHIFT = Voxels.CELL_SHIFT,
    CELL_DIM   = Voxels.CELL_DIM,
    CELL_MASK  = Voxels.CELL_MASK,
    
    SCALE_X    = Voxels.SCALE_X,
    SCALE_Y    = Voxels.SCALE_Y,
    SCALE_Z    = Voxels.SCALE_Z,
    
    console = {
      log: function() {
        self.postMessage( ['log'].concat(Array.prototype.slice.call(arguments)) );
      }
    };


//------------------------------------------------------------------------------------

//Checks if a voxel is transparent
function transparent(value) {
  return voxel_types[value].transparent;
}

//Recovers the texture coordinate for a voxel
function texture(value, dir) {
  return voxel_types[value].textures[dir];
}

//Tangent space vectors for faces
var tangent = [
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
  [1, 0, 0]];
  
//Pushes a vertex
function pushv(vv, a) {
  vv.push(a[0]);
  vv.push(a[1]);
  vv.push(a[2]);
  vv.push(a[3]);
  vv.push(a[4]);
}

//Constructs a mesh over the given region
function buildMesh(lo, hi) {

  var vertices  = new Array(6),
      p         = new Array(3),
      q         = [[0,0,0,0,0],
                   [0,0,0,0,0],
                   [0,0,0,0,0],
                   [0,0,0,0,0]];
  for(var i=0; i<6; ++i) {
    vertices[i] = [];
  }
  
  function addFace(x, y, z, type, dir, step) {

    var tc = texture(type, dir);
  
    //Compute center of face
    p[0] = x;
    p[1] = y;
    p[2] = z;
    if(dir&1) {
      p[dir>>1] += 1;
      dir ^= 1;
    }
    
    //Compute quad vertices
    var du = tangent[dir], 
        dv = tangent[dir^1];
    q[0][0] = p[0];
    q[1][0] = p[0] + step*dv[0];
    q[2][0] = p[0] + step*du[0];
    q[3][0] = p[0] + step*(du[0] + dv[0]);    
    for(var i=1; i<3; ++i) {
      q[0][i] = p[i];
      q[1][i] = p[i] + dv[i];
      q[2][i] = p[i] + du[i];
      q[3][i] = p[i] + du[i] + dv[i];
    }
    
    //Compute texture coordinates
    for(i=0; i<2; ++i) {
      q[0][i+3] = tc[i]*TEX_SCALE;
      q[1][i+3] = tc[i]*TEX_SCALE;
      q[2][i+3] = tc[i]*TEX_SCALE;
      q[3][i+3] = tc[i]*TEX_SCALE;
    }
    var us = -(du[0] ? step : 1),
        vs = (dv[0] ? step : 1); 
    q[1][3] += vs;
    q[2][4] += us;
    q[3][3] += vs;
    q[3][4] += us;
    
    //Append vertices
    var vv = vertices[dir];
    pushv(vv,q[0]);
    pushv(vv,q[1]);
    pushv(vv,q[2]);
    
    pushv(vv,q[1]);
    pushv(vv,q[2]);
    pushv(vv,q[3]);
  }

  voxel_set.rangeForeach(lo, hi, 1, function(x, y, z, vals, step) {
    
    var center = vals[1 + 3 + 9];
    if(center === 0)
      return;
  
    //-x
    if(transparent(vals[3+9])) {
      addFace(x,y,z,center,0,1);
    }
    //+x
    if(transparent(vals[2+3+9])) {
      addFace(x,y,z,center,1,1);
    }
    //-y
    if(transparent(vals[1+3])) {
      addFace(x,y,z,center,2,step);
    }
    //+y
    if(transparent(vals[1+3+18])) {
      addFace(x,y,z,center,3,step);
    }
    //-z
    if(transparent(vals[1+9])) {
      addFace(x,y,z,center,4,step);
    }
    //+z
    if(transparent(vals[1+6+9])) {
      addFace(x,y,z,center,5,step);
    }
  });

  return vertices;
};

//------------------------------------------------------------------------------------

//Web worker <-> EventEmitter bindings
function post() { self.postMessage(Array.prototype.slice.call(arguments)); }
self.onmessage = function(event) { emitter.emit.apply(emitter, event.data); };

//Marks a cell as dirty
function markCell(cx, cy, cz) {
  var key = Voxels.hashChunk(cx,cy,cz);
  if(!(key in dirty_cells)) {
    dirty_cells[key] = [cx,cy,cz];
  }
}

//Marks a whole chunk as dirty
function markChunk(cx, cy, cz) {
  var bx = cx * SCALE_X,
      by = cy * SCALE_Y,
      bz = cz * SCALE_Z;
  for(var i=0; i<SCALE_X; ++i)
  for(var j=0; j<SCALE_Y; ++j)
  for(var k=0; k<SCALE_Z; ++k) {
    markCell(bx+i, by+j, bz+k);
  }
}

//Creates chunks from all the pending updates
function makeCells() {

  for(var id in dirty_cells) {
  
    var cell = dirty_cells[id],
        x = cell[0]<<CELL_SHIFT,
        y = cell[1]<<CELL_SHIFT,
        z = cell[2]<<CELL_SHIFT;
    if(!voxel_set.isCellMapped(x,y,z)) {
      post('removeCell', cell);
    }
    else {
      
      var vertices = buildMesh([x,y,z], [x+CELL_DIM,y+CELL_DIM,z+CELL_DIM]);
      
      //Check if vertex list is empty
      var empty = true;
      for(var i=0; i<6; ++i) {
        if(vertices[i].length !== 0) {
          empty = false;
          break;
        }
      }
      
      if(empty) {
        post('removeCell', cell);
      }
      else {
        post('updateCell', cell, vertices);
      }
    }
    
    //Delete old ids when we are done with them
    delete dirty_cells[id];
  }
  
};


//Bind events
emitter.on('stop', function() {
  if(!voxel_set)
    return;
  clearInterval(worker_interval);
  dirty_cells = {};
  voxel_set = null;
  worker_interval = null;
  post('stopped');
  close();
});

emitter.on('start', function() {
  post('started');
});

emitter.on('setVoxel', function(x,y,z,v) {
  if(!voxel_set)
    return;
  if(voxel_set.set(x,y,z,v) !== v) {
    markCell(x>>CELL_SHIFT, y>>CELL_SHIFT, z>>CELL_SHIFT);
  }
});

emitter.on('updateChunk', function(cx,cy,cz,data) {
  if(!voxel_set)
    return;
  voxel_set.setChunk(cx,cy,cz,data);
  markChunk(cx, cy, cz);
});

emitter.on('removeChunk', function(cx,cy,cz) {
  if(!voxel_set)
    return;
  voxel_set.removeChunk(cx,cy,cz);
  markChunk(cx, cy, cz);
});


emitter.on('reset', function() {
  voxel_set.clear();
  for(var id in dirty_cells) {
    delete dirty_cells[id];
  }
});

Object.freeze(this);


