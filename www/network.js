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
  
  //Displays a chat message
  chat : function(mesg) {
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


