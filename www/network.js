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
    if(Game.instance) {
      for(var i=0; i<patches.length; ++i) {
        Game.instance.updateEntity(patches[i]);
      }
    }
  },
  
  //Deletes an entity
  deleteEntities : function(deletions) {
    if(Game.instance) {
      for(var i=0; i<deletions.length; ++i) {
        Game.instance.destroyEntity(deletions[i]);
      }
    }
  },
  
  //Updates a bunch of voxels
  setVoxels : function(updates) {
    for(var i=0; i<updates.length; i+=4) {
      VoxelClient.setVoxelAuthoritative(
        updates[i],
        updates[i+1],
        updates[i+2],
        updates[i+3]);
    }
  },
  
  //Updates a chunk
  updateChunks : function(updates, cb) {
    console.log(updates);
    for(var i=0; i<updates.length; ++i) {
      VoxelClient.updateChunk(updates[i][0], updates[i][1], updates[i][2], updates[i][3]);
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


