var dnode = require('dnode'),
    Voxels = require('./voxels.js');

function Connection(rpc, connection) {
  this.rpc_       = rpc;
  this.connection = connection;
}

Connection.prototype.login = function(session_id, cb) {
  this.rpc_.login(session_id, cb);
}

Connection.prototype.createPlayer = function(options, cb) {
  this.rpc_.createPlayer(options, cb);
}


Connection.prototype.deletePlayer = function(player_name, cb) {
  this.rpc_.deletePlayer(player_name, cb);
}

Connection.prototype.joinGame = function(player_name, cb) {
  this.rpc_.joinGame(player_name, cb);
}

Connection.prototype.remoteMessage = function(action_name, entity_id, args) {
  this.rpc_.remoteMessage(action_name, entity_id, args);
}



exports.connectToServer = function(engine, cb) {

  var tout = engine.game_module.socket_timeout;

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
      var first_load = engine.notifyUpdate(tick_count);
      
      //Handle updates
      if(updates.length > 0) {
        if(first_load) {
         for(var i=0; i<updates.length; ++i) {
            instance.updateEntity(updates[i]);
          }
        }
        else {
          engine.instance.addFuture(tick_count, function() {
            for(var i=0; i<updates.length; ++i) {
              instance.updateEntity(updates[i]);
            }
          });
        }
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
      
      //Handles voxel updates (these are processed separately from normal messages, due to large volume)
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
    
    //Called on client by server
    remoteMessage : function(tick_count, action_name, entity_id, params) {    
      if(engine.instance) {
        engine.instance.remoteMessage(action_name, entity_id, params);
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
  }, {
    //'connectTimeout':tout,
    'transports':engine.game_module.socket_transports,
    //'rememberTransport':false,
    
    /*
    transportOptions: {
      'flashsocket': {
        closeTimeout: tout,
        timeout: tout
      }, 'websocket': {
        closeTimeout: tout,
        timeout: tout
      }, 'htmlfile': {
        closeTimeout: tout,
        timeout: tout
      }, 'xhr-multipart': {
        closeTimeout: tout,
        timeout: tout
      }, 'xhr-polling': {
        closeTimeout: tout,
        timeout: tout
      }, 'jsonp-polling': {
        closeTimeout: tout,
        timeout: tout
      }
    } 
    */
  });
}

