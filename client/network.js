var dnode = require('dnode');

function Connection(rpc, connection) {
  this.rpc        = rpc;
  this.connection = connection;
}

exports.connectToServer = function(engine, cb) {
  dnode({
  
    //Declare RPC methods
    updateChunks : function(chunks) {
    },
    
    setVoxels : function(voxels) {
    },
    
    updateEntities : function(entities) {
    },
    
    removeEntities : function(entities) {
    },
    
  }).connect(function(rpc, connection) {
  
    connection.on('end', function() {
      throw Error("Lost connection to network");
    });
    
    cb(new Connection(rpc, connection));
  });
}

