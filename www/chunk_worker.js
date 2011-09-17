"use strict";

importScripts('/voxels.js', '/events.js');

//Set up stuff
var emitter = new EventEmitter(),
    voxel_set = null,
    worker_interval = null,
    dirty_cells = {},
    
    CHUNK_X = Voxels.CHUNK_X,
    CHUNK_Y = Voxels.CHUNK_Y,
    CHUNK_Z = Voxels.CHUNK_Z,
    
    CELL_SHIFT  = 4,
    CELL_SIZE   = (1<<CELL_SHIFT),
    CELL_MASK   = CELL_SIZE-1,
    
    SCALE_X     = CHUNK_X/CELL_SIZE,
    SCALE_Y     = CHUNK_Y/CELL_SIZE,
    SCALE_Z     = CHUNK_Z/CELL_SIZE,
    
    console = { 
      log: function() {
        postMessage( ['log'].concat(Array.prototype.slice.call(arguments, 0)) );
      }
    };

//Web worker <-> EventEmitter bindings
function post() { postMessage(Array.prototype.slice.call(arguments, 0)); }
onmessage = function(args) { emitter.emit.apply(emitter, args); };

//Marks a cell as dirty
function markCell(cx, cy, cz) {
  var key = Voxels.hashChunk(cx,cy,cz);
  if(!(key in dirty_cells)) {
    dirty_chunks[key] = [cx,cy,cz];
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

//Checks if a voxel is transparent
function transparent(value) {
  return value === 0;
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
}

//Constructs a mesh over the given region
function buildMesh(lo, hi) {

  var vertices  = new Array(6),
      p         = new Array(3);
      q         = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
  for(var i=0; i<6; ++i) {
    vertices[i] = [];
  }
  
  function addFace(x, y, z, type, dir, step) {
  
    //Compute center of face
    p[0] = x;
    p[1] = y;
    p[2] = z;
    p[dir>>1] += 0.5 * (dir&1 ? 1.0 : -1.0);
    
    //Compute quad vertices
    var du = tangent[dir], dv = tangent[dir^1];
    q[0][0] = p[0] - 0.5 * (du[0] + dv[0]);
    q[1][0] = p[0] - 0.5 * du[0] + (step+0.5)*dv[0];
    q[2][0] = p[0] + (step-0.5)*du[0] - 0.5 * dv[0];
    q[3][0] = p[0] + (step-0.5)*(du[0] + dv[0]);    
    for(var i=1; i<3; ++i) {
      q[0][i] = p[i] - 0.5 * (du[i] + dv[i]);
      q[1][i] = p[i] + 0.5 * (-du[i] + dv[i]);
      q[2][i] = p[i] + 0.5 * (du[i] - dv[i]);
      q[3][i] = p[i] + 0.5 * (du[i] + dv[i]);
    }
    
    //Append vertices
    var vv = vertices[dir];
    pushv(vv,q[0]);
    pushv(vv,q[1]);
    pushv(vv,q[2]);
    
    pushv(vv,q[2]);
    pushv(vv,q[1]);
    pushv(vv,q[3]);
  }

  voxel_set.rangeForeach(lo, hi, 1, function(x, y, z, window, step) {
  
    var center = window[1 + 3 + 9];
    if(center == 0)
      return;
  
    //-x
    if(transparent(window[3+9])) {
      addFace(x,y,z,center,0,1);
    }
    //+x
    if(transparent(window[2+3+9])) {
      addFace(x,y,z,center,1,1);
    }
    //-y
    if(transparent(window[1+3])) {
      addFace(x,y,z,center,2,step);
    }
    //+y
    if(transparent(window[1+3+18])) {
      addFace(x,y,z,center,3,step);
    }
    //-z
    if(transparent(window[1+9])) {
      addFace(x,y,z,center,4,step);
    }
    //+z
    if(transparent(window[1+6+9])) {
      addFace(x,y,z,center,5,step);
    }
  });

  return vertices;
};


//Creates chunks from all the pending updates
function makeCells() {
  for(var id in dirty_cells) {
    var cell = dirty_cells[id],
        x = cell[0]<<CELL_SHIFT,
        y = cell[1]<<CELL_SHIFT,
        z = cell[2]<<CELL_SHFIT;
    if(!voxel_set.isPointMapped(x,y,z)) {
      post('remove_cell', cell);
    }
    else {
      post('update_cell', cell, buildMesh([x,y,z], [x+CELL_SIZE,y+CELL_SIZE,z+CELL_SIZE]));
    }
  }
  dirty_cells = {};
};


//Bind events
emitter.on('stop', function() {
  clearInterval(makeChunks);
  dirty_cells = {};
  voxel_set = null;
});

emitter.on('reset', function() {
  voxel_set = new Voxels.ChunkSet();
  post('resetComplete');
  worker_interval = setInterval(makeChunks);
  dirty_cells = {};
});

emitter.on('setBlock', function(x,y,z,v) {
  if(voxel_set.set(x,y,z,v)) {
    markCell(x>>CELL_SHIFT, y>>CELL_SHIFT, z>>CELL_SHIFT);
  }
});

emitter.on('setChunk', function(cx,cy,cz,data) {
  voxel_set.setChunk(cx,cy,cz,data);
  markChunk(cx, cy, cz);
});

emitter.on('removeChunk', function(cx,cy,cz) {
  voxel_set.removeChunk(cx,cy,cz);
  markChunk(cx, cy, cz);
});

