var dnode = require('dnode'),
    Voxels = require('./voxels.js');

function Connection(rpc, connection) {
  this.rpc        = rpc;
  this.connection = connection;
}

exports.connectToServer = function(engine, cb) {
  dnode({

    notifyLoadComplete : function() {
      engine.notifyLoadComplete();
    },
  
    setVoxels : function(updates) {
      for(var i=0; i<updates.length; i+=2) {
        var k = parseInt(updates[i]),
            x = Voxels.unhash(k),
            y = Voxels.unhash(k>>1),
            z = Voxels.unhash(k>>2);
        engine.voxels.setVoxelAuthoritative(x, y, z, updates[i+1]);
      }
    },
    
    updateEntities : function(patches) {
      if(engine.instance) {
        for(var i=0; i<patches.length; ++i) {
          engine.instance.updateEntity(patches[i]);
        }
      }
    },
    
    deleteEntities : function(deletions) {
      if(engine.instance) {
        for(var i=0; i<deletions.length; ++i) {
          engine.instance.destroyEntity(deletions[i]);
        }
      }
    },

    updateChunks : function(updates, cb) {
      for(var i=0; i<updates.length; i+=2) {
         var k = parseInt(updates[i]),
            x = Voxels.unhash(k),
            y = Voxels.unhash(k>>1),
            z = Voxels.unhash(k>>2);
        engine.voxels.updateChunk(x, y, z, updates[i+1]);
      }
      cb();
    },
    
    logHTML : function(html_str) {
      if(engine.instance) {
        engine.instance.logHTML(html_str);
      }
    }
    
  }).connect(function(rpc, connection) {
  
    connection.on('end', function() {
      throw Error("Lost connection to network");
    });
    
    connection.on('error', function(err) {
      console.log("Damn network error:", err);
      if(err instanceof Error) {
        engine.crash(err);
      }
      else {
        throw Error(err);
      }
    });
    
    cb(new Connection(rpc, connection));
  });
}

