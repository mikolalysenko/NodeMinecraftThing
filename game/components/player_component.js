var CORRECT_THRESHOLD = 10.0;


var framework = null,
    computePosition = null;
exports.registerFramework = function(f) {
  framework = f;
  computePosition = framework.default_components['motion'].computePosition;  
};

//Registers instance
exports.registerInstance = function(instance) {
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
  
    function processInput() {
      var buttons = instance.getButtons();
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
      
      var v = entity.velocity();
      
      //Update entity velocity         
      if(v[0] != nx || v[2] != nz ) {
         entity.setVelocity([nx, 0, nz]);
         entity.message('input', 
            entity.state.motion_start_tick,
            entity.state.position,
            entity.state.velocity);
      }    
    };
    
    function checkPosition() {
      var net_position = computePosition(instance.region.tick_count, entity.net_state),
          local_position = entity.position(),
          d = 0;
      for(var i=0; i<3; ++i) {
        d = Math.max(d, Math.abs(net_position[i] - local_position[i]));
      }
      return d <= CORRECT_THRESHOLD;
    }
    
  
    //Apply input here
    entity.emitter.on('tick', function() {
      processInput();
      updateAnimation();
    });
    
    
    //Handle action press here
    instance.emitter.on('press_action', function(button) {
      var x = entity.position();
      instance.message('voxel', Math.floor(x[0]), Math.floor(x[1]), Math.floor(x[2]));
    });
    
    //Correct player's local position
    entity.emitter.on('net_update', function(net_state, overrides) {
      
      //Check if local position is acceptable
      if(net_state.motion_start_tick <= entity.state.motion_start_tick && checkPosition() ) {
        //Save motion state and update
        var params = entity.getMotionParams();
        overrides.push(function() {
          entity.setMotionParams(params);
        });
      }
      else {
        //Otherwise, need to correct player position
        var v = entity.velocity();
        overrides.push(function() {
          entity.setVelocity(v);
        });
      }
    });
    
    //Logs a message to the player
    entity.emitter.on('server_log', function(html_str) {
      instance.logHTML(html_str);
    });
  }  
  else {
  
    //Tick
    entity.emitter.on('tick', function() {
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
         velocity.length !== 3 ||
         ticks <= entity.motion_start_tick) {
         console.log("Bad input packet");
         return;       
      }
      
      var p = computePosition(ticks, entity.state),
          d = 0.0,
          dt = instance.region.tick_count - ticks;
          
      for(var i=0; i<3; ++i) {
        d = Math.max(d, Math.abs(p[i] - position[i])) ;
      }
      if(d > CORRECT_THRESHOLD) {
        console.log("Player is out of sync");
        entity.setVelocity(velocity);
        return;
      }

      entity.state.position = position;
      entity.state.velocity = velocity;
      entity.state.motion_start_tick = ticks;
    });
  }  
};

