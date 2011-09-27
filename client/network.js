var dnode = require('dnode'),
    Voxels = require('./voxels.js');

function Connection(rpc, connection) {
  this.rpc        = rpc;
  this.connection = connection;
}


exports.connectToServer = function(engine, cb) {

  dnode({

    changeInstance : function(region_info) {
      engine.changeInstance(region_info);
    },
  
    updateInstance : function(tick_count, updates, removals, voxels) {
      var instance = engine.instance;

      if(!instance) {
        console.warn("Got an update packet before instance started!");
        return;
      }
      
      //Notify game engine
      engine.notifyUpdate();
      
      //Handle updates
      if(updates.length > 0) {
        engine.instance.addFuture(tick_count, function() {
          for(var i=0; i<updates.length; ++i) {
            instance.updateEntity(updates[i]);
          }
        });
      }
      
      //Handles removals
      if(removals.length > 0) {
      
        function handleRemoval(i) {
          instance.addFuture(removals[i], function() {
            instance.destroyEntity(removals[i+1]);
          });
        };
        
        for(var i=0; i<removals.length; i+=2) {
          handleRemoval(i);
        }
      }
      
      //Handles voxels
      if(voxels.length > 0) {
      
        function handleVoxel(i) {
          instance.addFuture(voxels[i+2], function() {
            var k = parseInt(voxels[i]),
                x = Voxels.unhash(k),
                y = Voxels.unhash(k>>1),
                z = Voxels.unhash(k>>2);    
            engine.voxels.setVoxelAuthoritative(x, y, z, voxels[i+1]);
          });
        };
        
        for(var i=0; i<voxels.length; i+=3) {
          handleVoxel(i);
        }
      }
    },

    //Called when some chunks get updated
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
    
    //Logs a string to the terminal
    logHTML : function(html_str) {
      if(engine.instance) {
        engine.instance.logHTML(html_str);
      }
    },
    
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

