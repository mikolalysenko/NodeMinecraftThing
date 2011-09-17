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
        self.postMessage( ['log'].concat(Array.prototype.slice.call(arguments)) );
      }
    };


//------------------------------------------------------------------------------------

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


  console.log("Building mesh", lo, hi, JSON.stringify(voxel_set.chunks));

  var vertices  = new Array(6),
      p         = new Array(3),
      q         = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
  for(var i=0; i<6; ++i) {
    vertices[i] = [];
  }
  
  function addFace(x, y, z, type, dir, step) {
  
    console.log(
      "Adding face:", [x,y,z],
      "dir:", dir,
      "step:", step);
  
    //Compute center of face
    p[0] = x;
    p[1] = y;
    p[2] = z;
    if(dir&1) {
      p[dir>>1] += 1;
    }
    
    //Compute quad vertices
    var du = tangent[dir], dv = tangent[dir^1];
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
      
    console.log("Visiting: ", [x,y,z],
      "window: ", vals,
      "step: ", step);
  
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
    if(!voxel_set.isPointMapped(x,y,z)) {
      post('removeCell', cell);
    }
    else {
      post('updateCell', cell, buildMesh([x,y,z], [x+CELL_SIZE,y+CELL_SIZE,z+CELL_SIZE]));
    }
  }
  dirty_cells = {};
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
  voxel_set = new Voxels.ChunkSet();
  worker_interval = setInterval(makeCells);
  dirty_cells = {};
  post('started');
  console.log("Worker started!");
});

emitter.on('setVoxel', function(x,y,z,v) {
  if(!voxel_set)
    return;
  if(voxel_set.set(x,y,z,v)) {
    markCell(x>>CELL_SHIFT, y>>CELL_SHIFT, z>>CELL_SHIFT);
  }
});

emitter.on('setChunk', function(cx,cy,cz,data) {
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

