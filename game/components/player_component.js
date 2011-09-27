var framework = null;
exports.registerFramework = function(f) { framework = f; };

//Registers instance
exports.registerInstance = function(instance) {
  console.log("Registered instance");
};

//Registers an entity
exports.registerEntity = function(entity) {

  var instance = entity.instance;
  if(!instance) {
    return;
  }

  function updateAnimation() {
    //Set player animation
    var vtotal = 0;
    for(var i=0; i<3; ++i) {
      vtotal += Math.abs(entity.state.velocity[i]);
    }
    if(vtotal > 0.01) {
      if(entity.state.anim == 'idle') {
        entity.emitter.emit('play_anim', 'walk');
      }
    }
    else {
      if(entity.state.anim != 'idle') {
        entity.emitter.emit('play_anim', 'idle');
      }
    }
  }


  //Use different event handlers for local player
  var is_local_player = instance.client && 
                        entity === instance.engine.playerEntity();
  if(is_local_player) {
  
    console.log("Registering local player");
        
    var engine = instance.engine,
        need_update = false;
    
    //Apply input here
    entity.emitter.on('tick', function() {
      var buttons = engine.input.getState();

      for(var i=0; i<3; ++i) {
        entity.state.position[i] += entity.state.velocity[i];
      }
      
      var nx = 0, nz = 0;
      
      if(buttons['up'] > 0) {
        nz -= 0.125;
      }
      if(buttons['down'] > 0) {
        nz += 0.125;
      }
      if(buttons['right'] > 0) {
        nx += 0.125;
      }
      if(buttons['left'] > 0) {
        nx -= 0.125;
      }
      
      if(entity.state.velocity[0] != nx ||
         entity.state.velocity[2] != nz ) {
         entity.state.velocity[0] = nx;
         entity.state.velocity[2] = nz;
         need_update = true;
      }
         
      
      updateAnimation();
    });
  
    //Correct player's local position
    entity.emitter.on('net_update', function() {
      //Disregard
    });
      
    //Create a packet and pass it to the server  
    entity.emitter.on('get_net_packet', function(cb) {
      if(!need_update) {
        return
      }
    
      need_update = false;
      var packet = [entity.instance.region.tick_count + engine.lag, entity.state.position, entity.state.velocity];
      cb(packet);
    });
  }  
  else {
  
    console.log("Registering networked player");

    entity.emitter.on('tick', function() {
      var p = entity.state.position,
          v = entity.state.velocity;
      for(var i=0; i<3; ++i) {
        p[i] += v[i];
      }
      updateAnimation();
    });

    //Apply a network packet to update player position  
    entity.emitter.on('apply_net_packet', function(packet) {
    
      if(typeof(packet) !== 'object' ||
         !(packet instanceof Array) ||
         typeof(packet[0]) !== 'number' ||
         typeof(packet[1]) !== 'object' ||
         typeof(packet[2]) !== 'object' ) {
         console.log("Bad input packet", packet);
         return;       
      }
    
      var dt = entity.instance.region.tick_count - packet[0],
          p = packet[1],
          q = packet[2];
          
      for(var i=0; i<3; ++i) {
        if(typeof(p[1]) !== 'number' || typeof(q[1]) !== 'number') {
          continue;
        }
        entity.state.position[i] = p[i] + q[i]*dt;
        entity.state.velocity[i] = q[i];
      }
    });
  }  
};

