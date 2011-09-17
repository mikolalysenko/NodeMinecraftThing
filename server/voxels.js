var Voxels = {};
if(typeof(exports) !== "undefined") {
  Voxels = exports;
}

(function() {

var CHUNK_SHIFT_X = 8,
    CHUNK_SHIFT_Y = 4,
    CHUNK_SHIFT_Z = 4,
    CHUNK_X       = (1<<CHUNK_SHIFT_X),
    CHUNK_Y       = (1<<CHUNK_SHIFT_Y),
    CHUNK_Z       = (1<<CHUNK_SHIFT_Z),
    CHUNK_MASK_X  = CHUNK_X - 1,
    CHUNK_MASK_Y  = CHUNK_Y - 1,
    CHUNK_MASK_Z  = CHUNK_Z - 1,
    CHUNK_SIZE    = CHUNK_X * CHUNK_Y * CHUNK_Z;
    
function flattenIndex(i, j, k) {
  return i + CHUNK_X * (k + CHUNK_Z * j);
};

function expand(x) {
  x &= 0x3FF;
  x  = (x | (x<<8)) & 251719695;
  x  = (x | (x<<4)) & 3272356035;
  x  = (x | (x<<2)) & 1227133513
  return x;
};

function hashCode(i,j,k) {
  return expand(i)+(expand(j)<<1)+(expand(k)<<2);
};

function Chunk(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.data = [0, 0];
};

Chunk.prototype.isEmpty = function() {
  return (this.data.length == 2 && this.data[1] == 0);
};

Chunk.prototype.bsearch = function (lo, hi, y) {
  lo >>= 1;
  hi >>= 1;
  var m, x;
  while(lo+1 < hi) {
    m = (lo + hi) >> 1;
    x = this.data[m<<1];
    if( x > y ) {
      hi = m - 1;
    } else if( x < y ) {
      lo = m;
    } else {
      return m<<1;
    }
  }
  return lo<<1;
};

Chunk.prototype.index = function(i, j, k) {
  var y = flattenIndex(i, j, k),
      lo = 0, 
      hi = (this.data.length>>1)-1;
  return this.bsearch(0, this.data.length, y);
};

Chunk.prototype.get = function(i, j, k) {
  return this.data[this.index(i,j,k)+1];
};

Chunk.prototype.set = function(i, j, k, v) {
  var y = flattenIndex(i, j, k),
      m = this.bsearch(0, this.data.length, y),
      interval_start = this.data[m],
      interval_end   = (m+2 < this.data.length ? this.data[m+2] : CHUNK_SIZE),
      interval_val   = this.data[m+1];
      
  if(v === interval_val) {
    return false;
  }
  if(y === interval_start) {
    if(interval_start + 1 == interval_end) {
      this.data[m+1] = v;
      
      if(m+3<this.data.length && this.data[m+3] == v) {        
        if(m > 0 && this.data[m-1] == v) {
          this.data = this.data.slice(0, m).concat(this.data.slice(m+4));
        }
        else {
          this.data = this.data.slice(0, m+2).concat(this.data.slice(m+4));
        }
      }
      else if(m > 0 && this.data[m-1] == v) {
        this.data = this.data.slice(0, m).concat(this.data.slice(m+2));
      }
    }
    else if(m > 0 && this.data[m-1] == v) {
      ++this.data[m];
    }
    else {
      this.data = this.data.slice(0, m).concat([y, v, y+1, interval_val], this.data.slice(m+2));
    }
  }
  else if(y === interval_end - 1) {
    if(m + 3 < this.data.length && this.data[m+3] === v) {
      --this.data[m+2];
    }
    else {
      this.data = this.data.slice(0, m+2).concat([y, v], this.data.slice(m+2));
    }
  }
  else {
    this.data = this.data.slice(0, m+2).concat([y, v, y+1, interval_val], this.data.slice(m+2));
  }
  return true;
};

//Keeps track of voxel data
ChunkSet = function() {
  this.chunks       = {};
  this.dirty_chunks = {};
};

ChunkSet.prototype.setChunk = function(cx,cy,cz,data) {
  var key = hashCode(cx,cy,cz),
      chunk = this.chunks[key];
      
  if(chunk) {
    chunk.data = data;
  }
  else {
    chunk = new Chunk(cx,cy,cz,data);
    this.chunks[key] = chunk;
  }
  this.dirty_chunks[key] = chunk;
};

ChunkSet.prototype.getChunk = function(cx,cy,cz) {
  return this.chunks[hashCode(cx,cy,cz)];
};

ChunkSet.prototype.removeChunk = function(cx,cy,cz) {
  var key = hashCode(cx,cy,cz);
  if(key in this.chunks) {
    delete this.chunks[key];
    this.dirty_chunks[key] = null;
  }
};

ChunkSet.prototype.modifiedChunks = function() {
  var dirty = this.dirty_chunks;
  this.dirt_chunks = {};
  return dirty;
};

ChunkSet.prototype.set = function(x, y, z, v) {
  var cx = x>>CHUNK_SHIFT_X,
      cy = y>>CHUNK_SHIFT_Y,
      cz = z>>CHUNK_SHIFT_Z,
      ix = x& CHUNK_MASK_X,
      iy = y& CHUNK_MASK_Y,
      iz = z& CHUNK_MASK_Z;

  var key = hashCode(cx, cy, cz),
      chunk = this.chunks[key];
      
  if(chunk) {
    if(chunk.set(ix, iy, iz, v)) {
      if(chunk.isEmpty()) {
        delete this.chunks[key];
        this.dirty_chunks[key] = null;
      }
      else {
        this.dirty_chunks[key] = chunk;
      }
    }
  }
  else if(v !== 0) {
    chunk = new Chunk(cx, cy, cz);
    chunk.set(ix, iy, iz, v);
    this.chunks[key]       = chunk;
    this.dirty_chunks[key] = chunk;
  }
};

ChunkSet.prototype.get = function(x, y, z) {
  var cx = x>>CHUNK_SHIFT_X,
      cy = y>>CHUNK_SHIFT_Y,
      cz = z>>CHUNK_SHIFT_Z;
  var chunk = this.getChunk(cx, cy, cz);
  if(chunk) {
    var ix = x& CHUNK_MASK_X,
        iy = y& CHUNK_MASK_Y,
        iz = z& CHUNK_MASK_Z;
    return chunk.get(ix, iy, iz);
  }
  return 0;
};

//------------------------------------------------------------------------------
//Iterates over a range of values in the chunk set with varying neighborhood radii
//
// lo = lower bound of region
// hi = upper bound of region
// n = radius of window (actual window size is 2*n+1)
// cb = User specified call back
//
//    Arguments for cb:
//      x,y,z   - Start of run
//      window  - Values within window (flattened in xzy order)
//      lenght  - Length of run
//
//------------------------------------------------------------------------------
ChunkSet.prototype.rangeForeach = function(lo, hi, n, cb) {
  var nmod        = 2*n+1,
      size        = nmod*nmod*nmod,
      itersize    = nmod*nmod,
      iterators   = new Array(itersize),
      vals        = new Array(size),
      i, j, k, l, m, step, v, dx, dy, dz, can_skip;
  
  i = 0;
  for(dy=-n; dy<=n; ++dy)
  for(dz=-n; dz<=n; ++dz) {
    iterators[i++] = new ChunkIterator(this, lo[0]-n, lo[1]+dy, lo[2]+dz);
  }
  
  j=lo[1];
  while(true) {
    k=lo[2];
    while(true) {
    
      //Initialize window
      for(var l=0, m=0; l<itersize; ++l) {
        vals[m++] = 10000;
        for(dx=0; dx<nmod-1; ++dx, ++m) {
          vals[m] = iterators[l].value();
          iterators[l].move(1,0,0);
        }
      }
    
      i=lo[0]+1;
      while(i<hi[0]) {
      
        //Compute next step size
        step = hi[0] - i;
        can_skip = true;
        
        for(l=0, m=0; l<itersize; ++l) {
        
          //Read in front of the window
          for(dx=0; dx<nmod-1; ++dx, ++m) {
            vals[m] = vals[m+1];
            if(can_skip && dx > 0) {
              can_skip = (vals[m-1] === vals[m]);
            }
          }
          vals[m] = iterators[l].value();
          if(can_skip && n > 0) {
            can_skip = (vals[m-1] === vals[m]);
          }
          m++;
        
          //Compute step size
          v = iterators[l].span();
          if(step > v) {
            step = v;
          }
        }
        
        //Call function
        var vi = i-1, vstep = step;
        for(dx=0; dx<nmod-1; ++dx) {
        
          //Special case:  Window is constant
          if(can_skip) {
            break;
          }
          
          //Evaluate function, move cursor
          cb(vi++, j, k, vals, 1);
          if(--vstep === 0) {
            break;
          }
          
          //Shift window
          can_skip = true;
          for(m=0; m<size; m+=nmod) {
            for(l=0; l<nmod-dx-1; ++l) {
              vals[m+l] = vals[m+l+1];
              if(can_skip && l > 0) {
                can_skip = vals[m+l-1] === vals[m+l];
              }
            }
          }
        }
        if(vstep > 0) {
          cb(vi, j, k, vals, vstep);
        }
            
        //Check if this span is done
        if(i + step >= hi[0])
          break;
          
        //Otherwise move iterators
        i += step;
        for(l=0; l<itersize; ++l) {
          iterators[l].move(step, 0, 0);
        }
      }
      
      if(++k >= hi[2])
        break;
      for(l=0; l<itersize; ++l) {
        iterators[l].move(lo[0]-i-n, 0, 1);
      }
    }
    
    if(++j >= hi[1])
      break;
    for(l=0; l<itersize; ++l) {
      iterators[l].move(lo[0]-i-n, 1, 1+lo[2]-k);
    }
  }
};

ChunkIterator = function(chunk_set, x, y, z) {
  this.chunk_set  =chunk_set;
  
  this.cx = x >> CHUNK_SHIFT_X;
  this.cy = y >> CHUNK_SHIFT_Y;
  this.cz = z >> CHUNK_SHIFT_Z;
  this.ix = x &  CHUNK_MASK_X;
  this.iy = y &  CHUNK_MASK_Y;
  this.iz = z &  CHUNK_MASK_Z;
 
  this.recompute(); 
};

ChunkIterator.prototype.recompute = function() {
  var chunk = this.chunk_set.getChunk(this.cx, this.cy, this.cz);
  if(chunk) {
    this.chunk    = chunk;
    this.index    = flattenIndex(this.ix, this.iy, this.iz);
    this.data_pos = this.chunk.bsearch(0, this.chunk.data.length, this.index);
  }
  else {
    this.chunk      = null;
    this.index      = flattenIndex(this.ix, this.iy, this.iz);
    this.data_pos   = 0;
  }
};

ChunkIterator.prototype.value = function() {
  if(this.chunk) {
    return this.chunk.data[this.data_pos+1];
  }
  return 0;
};

ChunkIterator.prototype.span = function() {
  var s = CHUNK_X - this.ix;
  if(this.chunk) {
    if(this.data_pos + 2 >= this.chunk.data.length) {
      var t = CHUNK_SIZE - this.index;
      if(t < s) {
        return t;
      }
      return s;
    }
    var t = this.chunk.data[this.data_pos+2] - this.index;
    if(t < s) {
      return t;
    }
    return s;
  }
  return s;
};

ChunkIterator.prototype.coordinate = function() {
  return [
    (this.cx<<CHUNK_SHIFT_X) + this.ix,
    (this.cy<<CHUNK_SHIFT_Y) + this.iy,
    (this.cz<<CHUNK_SHIFT_Z) + this.iz ];
};

ChunkIterator.prototype.move = function(dx, dy, dz) {

  var nx = this.ix + dx,
      ny = this.iy + dy,
      nz = this.iz + dz;

  this.ix = nx & (CHUNK_MASK_X);
  this.iy = ny & (CHUNK_MASK_Y);
  this.iz = nz & (CHUNK_MASK_Z);

  //If we walked out of bounds, then need to look up new chunk
  if(nx < 0 || nx >= CHUNK_X ||
     ny < 0 || ny >= CHUNK_Y ||
     nz < 0 || nz >= CHUNK_Z ) {
   
    this.cx = this.cx + (nx >> CHUNK_SHIFT_X);
    this.cy = this.cy + (ny >> CHUNK_SHIFT_Y);
    this.cz = this.cz + (nz >> CHUNK_SHIFT_Z);
    
    this.recompute();
    return;
  }
  
  //Otherwise, we are still in the same chunk, so we can save some time
  var pindex = this.index;
  this.index  = flattenIndex(this.ix, this.iy, this.iz);

  //No chunk case
  if(!this.chunk) {
    this.data_pos = 0;
    return;
  }
  //Moved forward case  
  else if(this.index >= pindex) {
  
    //Optimization: For moving at most 1 run forward/backward, don't do a full binary search
    // Makes rangeForeach amortized constant cost.
    var p0  = this.data_pos + 2;
        N   = this.chunk.data.length;
    if(p0 >= N) {
      return;
    }
    var i0 = this.chunk.data[p0];
    if(this.index < i0) {
      return;
    }
    var p1 = this.data_pos + 4;
    if(p1 >= N || this.index < this.chunk.data[p1]) {
      this.data_pos = p0;
      return;
    }
  
    //Fallback:  Moved more than 1 range, so do a binary search
    this.data_pos = this.chunk.bsearch(p1, N, this.index);
  }
  //Moved backward case
  else {
  
    //Check if still in same range
    var i0 = this.chunk.data[this.data_pos];
    if(this.index < i0) {
      return;
    }
    
    //Fallback: Do a binary search
    this.data_pos = this.chunk.bsearch(0, this.data_pos, this.index);
  }
};

var tangent = [
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
  [1, 0, 0]];
  
function pushv(vv, a) {
  vv.push(a[0]);
  vv.push(a[1]);
  vv.push(a[2]);
}

function transparent(voxel) {
  return voxel === 0;
}

ChunkSet.prototype.buildMesh = function(lo, hi) {

  console.log("here");
  
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

  this.rangeForeach(lo, hi, 1, function(x, y, z, window, step) {
  
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
}



//Declare public methods
Voxels.CHUNK_X    = CHUNK_X;
Voxels.CHUNK_Y    = CHUNK_Y;
Voxels.CHUNK_Z    = CHUNK_Z;
Voxels.CHUNK_SIZE = CHUNK_SIZE;
Voxels.Chunk      = Chunk;
Voxels.ChunkSet   = ChunkSet;

})();
