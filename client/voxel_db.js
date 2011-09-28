//Local variables
var Voxels = require('./voxels.js'),
    VoxelCell = require('./voxel_pass.js').VoxelCell,
    EventEmitter = require('events').EventEmitter,
    engine = null,
    cells = {},
    worker = null,
    voxel_set = null,
    emitter = new EventEmitter(),
    local_writes = {},
    local_write_interval = null;


//A local write (stored client side)
function LocalWrite(counter, prev) {
  this.counter  = counter;
  this.prev     = prev;
};

//Iterate on local writes, roll back any bad changes
function checkLocalWrites() {
  for(var id in local_writes) {
    var local = local_writes[id];
    
    if(--local.counter <= 0) {
      var k = parseInt(id),
          x = Voxels.unhash(k),
          y = Voxels.unhash(k>>1),
          z = Voxels.unhash(k>>2);
      voxel_set.set(x, y, z, local.prev);
      post('setVoxel', x, y, z, local.prev);
      delete local_writes[id];
    }
  }
};


//Posts a message to the worker
function post() {
  worker.postMessage(Array.prototype.slice.call(arguments));
} 

//Special case for handling console.log
emitter.on('log', function() {
  console.log.apply(console, ['VoxelWorker:'].concat(Array.prototype.slice.call(arguments)));
}); 

//Update a cell
emitter.on('updateCell', function(coord, vertices) {
  var key = Voxels.hashChunk(coord[0], coord[1], coord[2]);
  
  if(key in cells) {
    cells[key].update(vertices);
  }
  else {
    var vc = new VoxelCell(engine.render, coord[0], coord[1], coord[2]);
    vc.update(vertices);
    cells[key] = vc;
  }
});

//Removes a cell from the data set
emitter.on('removeCell', function(coord) {
  var key = Voxels.hashChunk(coord[0], coord[1], coord[2]);
  if(key in cells) {
    cells[key].release();
    delete cells[key];
  }
});

exports.init = function(engine_, cb) {
  
  engine = engine_;

  if(!window.Worker) {
    cb("Client does not support web workers");
    return;
  }
  
  console.log("Starting voxel worker");

  //Clear out local data
  cells = {};
  
  //Allocate initial voxel set
  voxel_set = new Voxels.ChunkSet();

  //Set up local write interval polling
  local_writes = {};
  local_write_interval = setInterval(checkLocalWrites, 1000);

  //Start the web worker
  worker = new Worker("/cell_worker.js");
  worker.onmessage = function(event) {
    emitter.emit.apply(emitter, event.data);
  };
  
  //Handle error condition from worker by crashing app
  worker.onerror = function(error) {
    worker.terminate();
    if(typeof(error) == "object" && "message" in error) {
      throw Error("VoxelWorker crashed: (" + error.filename + ":" + error.lineno + ") -- " + error.message);
    }
    else {
      throw Error("VoxelWorker crashed: " + JSON.stringify(error));
    }
  };
  
  //Wait for worker to start
  emitter.once('started', function() {
    console.log("Voxel worker started!");
    cb(null);
  });
  
  post('start');
};

//Clears the voxel set
exports.reset = function() {
  for(var id in cells) {
    cells[id].release();
  }
  cells = {};
  voxel_set.chunks = {};
  local_writes = {};
  post('reset');
}

//Stops the voxel client/worker
exports.deinit = function() {
  voxel_set = null;
  post('stop');
  
  //Release all cells
  for(var id in cells) {
    cells[id].release();
  }
  cells = {};
  
  //Clear out local writes
  local_writes = {};
  
  //Stop polling for updates
  if(local_write_interval) {
    clearInterval(local_write_interval);
    local_write_interval = null;
  }
  
  //Kill worker
  if(worker) {
    worker.onmessage = null;
    worker.terminate();
    worker = null;
  }
};


//Draws all the voxels
exports.draw = function(time, render, pass) {
  for(var id in cells) {
    cells[id].draw(pass);
  }
};

//Retrieves a voxel
exports.getVoxel = function(x,y,z) {
  return voxel_set.get(x,y,z);
}

//Called when a voxel gets updated locally
exports.setVoxel = function(x, y, z, v) {
  var p = voxel_set.set(x,y,z,v);
  if(p !== v) {
  
    //Mark local write in case it must be rolled back later
    var key   = Voxels.hashChunk(x,y,z),
        local = local_writes[key];
    if(local && local.prev === v) {
      delete local_writes[key];
    }
    else {
      local_writes[key] = new LocalWrite(5, p);
    }
    
    post('setVoxel', x, y, z, v);
  }
  return p;
};

//Called when a server confirms that a voxel has been set
exports.setVoxelAuthoritative = function(x, y, z, v) {

  //Remove local writes
  var key = Voxels.hashChunk(x,y,z);
  if(key in local_writes) {
    delete local_writes[key];
  }
  
  //Check if there was a correction
  if(voxel_set.set(x,y,z,v) !== v) {
    post('setVoxel', x, y, z, v);
  }
};

//Called when a chunk gets updated
exports.updateChunk = function(cx, cy, cz, data) {
  voxel_set.setChunk(cx,cy,cz,data);
  post('updateChunk', cx, cy, cz, data);
};

//Called when a chunk is removed
exports.removeChunk = function(cx, cy, cz) {
  voxel_set.removeChunk(cx, cy, cz);
  post('removeChunk', cx, cy, cz);
};

