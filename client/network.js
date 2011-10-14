var Voxels = require('./voxels.js');

var callback_id = -1,
    callbacks = [];

function makeCallback(cb) {
  callbacks[++callback_id] = cb;
  return callback_id;
}


function Connection(socket) {
  this.socket = socket;
}

Connection.prototype.login = function(session_id, cb) {
  this.socket.emit('login', session_id, makeCallback(cb));
}

Connection.prototype.createPlayer = function(options, cb) {
  this.socket.emit('createPlayer', options, makeCallback(cb));
}

Connection.prototype.deletePlayer = function(player_name, cb) {
  this.socket.emit('deletePlayer', player_name, makeCallback(cb));
}

Connection.prototype.joinGame = function(player_name, cb) {
  this.socket.emit('joinGame', player_name, makeCallback(cb));
}

Connection.prototype.remoteMessage = function(action_name, entity_id, args) {
  this.socket.emit('remoteMessage', action_name, entity_id, args);
}

Connection.prototype.disconnect = function() {
  this.socket.disconnect();
}

exports.connectToServer = function(engine, cb) {
  var tout    = engine.game_module.socket_timeout,
      socket  = io.connect(window.location.origin);
      
  function evalCallback(cb_num) {
    return function() {
      socket.emit.apply(socket, ['callback', cb_num].concat(Array.prototype.slice.call(arguments, 1)));
    }
  }


  socket.on('callback', function(cb_num) {
    var args = Array.prototype.slice.call(arguments, 1),
        cb = callbacks[cb_num];
        
    if(cb) {
      delete callbacks[cb_num];
      cb.apply(null, args);
    }
  });
  
  socket.on('changeInstance', function(region_info) {
    engine.changeInstance(region_info);
  });
  
  socket.on('updateInstance', function(tick_count, updates, removals, voxels) {
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
       for(var i=0; i<updates.length; i+=2) {
          instance.updateEntity(updates[i+1]);
        }
      }
      else {
        function addUpdate(i) {
          var tc = updates[i] - entity.net_delay,
              patch = updates[i+1];
          if(patch.motion && patch.motion < tc) {
            tc = Math.max(instance.region.tick_count+1, patch.motion.start_tick);
          }
          
          //Add network delay
          instance.addFuture(tc, function() {
            instance.updateEntity(updates[i+1]);
          });
        }
        for(var i=0; i<updates.length; i+=2) {
          addUpdate(i);
        }
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
  });

  //Called when some chunks get updated
  socket.on('updateChunks', function(updates, cb_num) {
    for(var i=0; i<updates.length; i+=2) {
       var k = parseInt(updates[i]),
          x = Voxels.unhash(k),
          y = Voxels.unhash(k>>1),
          z = Voxels.unhash(k>>2);
      engine.voxels.updateChunk(x, y, z, updates[i+1]);
    }
    
    var cb = evalCallback(cb_num);
    cb();
  });
  
    
  //Called on client by server
  socket.on('remoteMessage', function(tick_count, action_name, entity_id, params) {    
    if(engine.instance) {
      engine.instance.remoteMessage(action_name, entity_id, params);
    }
  });
  
  socket.on('disconnect', function() {
    throw Error("Lost connection to network");
  });
    
  socket.on('error', function(err) {
    console.log("Damn network error:", err);
    if(err instanceof Error) {
      engine.crash(err);
    }
    else {
      throw Error(err);
    }
  });
  
  socket.on('connect', function() {
    cb(new Connection(socket));
  });
}

