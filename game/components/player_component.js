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
        
    //Apply input here
    entity.emitter.on('tick', function() {
      var buttons = instance.getButtons();

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
         
         entity.message('input', 
          entity.instance.region.tick_count + instance.engine.lag, 
          entity.state.position, 
          entity.state.velocity);
      }
      
      updateAnimation();
    });
    
    //Handle action press here
    instance.emitter.on('press_action', function(button) {
      var x = entity.state.position;
      instance.message('voxel', Math.floor(x[0]), Math.floor(x[1]), Math.floor(x[2]));
    });
  
    //Correct player's local position
    entity.emitter.on('net_update', function() {
      //Disregard
    });
    
    //Logs a message to the player
    entity.emitter.on('server_log', function(html_str) {
      instance.logHTML(html_str);
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
    entity.emitter.on('remote_input', function(player, ticks, position, velocity) {
    
      if(player.entity !== entity ||
         typeof(ticks) !== 'number' ||
         typeof(position) !== 'object' ||
         !(position instanceof Array) ||
         position.length !== 3 ||
         typeof(velocity) !== 'object' ||
         !(velocity instanceof Array) ||
         velocity.length !== 3) {
         console.log("Bad input packet");
         return;       
      }
    
      var dt = entity.instance.region.tick_count - ticks;
      for(var i=0; i<3; ++i) {
        entity.state.position[i] = position[i] + velocity[i]*dt;
        entity.state.velocity[i] = velocity[i];
      }
    });
  }  
};

