var framework = null;
exports.registerFramework = function(f) {
  framework = f;
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
    var vel = entity.velocity,
        vtotal = 0;
    for(var i=0; i<3; ++i) {
      vtotal += Math.abs(vel[i]);
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
      var nx = 0, ny = 0, nz = 0, jumped=false;
      
      
      if(entity.onGround()) {
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
        if(buttons['jump'] > 0) {
          entity.applyImpulse([0,3,0]);
          jumped = true
        }
      }
      else {
        if(buttons['up'] > 0) {
          nz -= 0.01;
        }
        if(buttons['down'] > 0) {
          nz += 0.01;
        }
        if(buttons['right'] > 0) {
          nx += 0.01;
        }
        if(buttons['left'] > 0) {
          nx -= 0.01;
        }      
      }
            
      //Update entity velocity         
      var v = entity.getForce('input');
      if(v[0] != nx || v[1] != ny || v[2] != nz || jumped) {
        entity.setForce('input', [nx, ny, nz]);
        entity.message('input', entity.motion_params);
      }   
    };
    
    function checkPosition() {
      return true;
    }
    
  
    //Apply input here
    entity.emitter.on('tick', function() {
      processInput();
      updateAnimation();
    });
    
    
    //Handle action press here
    instance.emitter.on('press_action', function(button) {
      var x = entity.position;
      instance.message('voxel', Math.ceil(x[0])+1, Math.floor(x[1]), Math.floor(x[2]));
      
      /*
      entity.applyImpulse([0, 1, 0]);
      entity.message('input', entity.motion_params);
      */
    });
    
    //Correct player's local position
    entity.emitter.on('net_update', function(net_state, overrides) {
      
      //Check if local position is acceptable
      var m = framework.patcher.clone(entity.state.motion);
      
      overrides.push(function() {
        entity.state.motion = m;
      });      
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
    entity.emitter.on('remote_input', function(player, motion_params) {
    
      //console.log(JSON.stringify(motion_params));
      entity.motion_params = motion_params;
    });
  }  
};

