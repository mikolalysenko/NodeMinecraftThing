if(typeof(importScripts) !== "undefined") {
  importScripts('/voxels.js');
}
else {
  var Voxels = require('../server/voxels.js');
}



var voxel_set;

function transparent(value) {
  return value === 0;
}

exports.reset = function() {
  voxel_set = new Voxels.ChunkSet();
}

function exports.setBlock(x,y,z,v) { 
  voxel_set.set(x,y,z,v);
}

function exports.setChunk(cx,cy,cz,data) {
  voxel_set.setChunk(cx,cy,cz,data);
}

function exports.removeChunk(cx,cy,cz) {
  voxel_set.removeChunk(cx,cy,cz);
}


