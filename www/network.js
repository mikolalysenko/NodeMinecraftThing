//Interface with the web server
"use strict";

var Network = {};

(function() {

//Network state variables
Network.connected   = false;
Network.rpc         = null;
Network.connection  = null;

//Local call backs from the server
var local_interface = {


  //Called when state is fully initialized
  notifyLoadComplete : function(player_entity) {
    console.log("Load completed");
  },
  
  //Updates an entity locally
  updateEntities : function(patches) {
    console.log("Updating entities: ", patches);
    if(Game.instance) {
      for(var i=0; i<patches.length; ++i) {
        Game.instance.updateEntity(patches[i]);
      }
    }
  },
  
  //Deletes an entity
  deleteEntities : function(deletions) {
    console.log("Deleting entities: ", deletions);
    if(Game.instance) {
      for(var i=0; i<deletions.length; ++i) {
        Game.instance.destroyEntity(deletions[i]);
      }
    }
  },
  
  //Updates a bunch of voxels
  setVoxels : function(updates) {
    console.log("Setting voxels: ", updates);
    for(var i=0; i<updates.length; i+=2) {
      var k = parseInt(updates[i]),
          x = Voxels.unhash(k),
          y = Voxels.unhash(k>>1),
          z = Voxels.unhash(k>>2);
      VoxelClient.setVoxelAuthoritative(x, y, z, updates[i+1]);
    }
  },
  
  //Updates a chunk
  updateChunks : function(updates, cb) {
    console.log("Updating chunks:", updates);
    for(var i=0; i<updates.length; i+=2) {
      var k = parseInt(updates[i]),
          x = Voxels.unhash(k),
          y = Voxels.unhash(k>>1),
          z = Voxels.unhash(k>>2);
      VoxelClient.updateChunk(x, y, z, updates[i+1]);
    }
    cb();
  },
  
};

//Initialize the network interface
Network.init = function(cb) {
  DNode(local_interface).connect(function(rpc, connection) {
    Network.connected   = true;
    Network.rpc         = rpc;
    Network.connection  = connection;
    
    connection.on('end', function() {
      App.crash("Lost connection to network");
    });
    
    cb(null);
  });
};

})();


