var framework = null,
    physics = null;
exports.registerFramework = function(f) {
  framework = f;
  physics = framework.default_components.physics;
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


  entity.emitter.on('init', function() {
    entity.setForce('input', [0,0,0]);
  });

  //Use different event handlers for local player
  var is_local_player = instance.client && 
                        entity === instance.engine.playerEntity();
  if(is_local_player) {
  
    //HACK: Set entity control to local authoritative
    entity.net_delay = -1;
  
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
        entity.message('input', [instance.region.tick_count, entity.position, entity.velocity, entity.getForce('input')]);
      }   
    };
    
    function checkPosition() {
      return true;
    }
    
  
    //Apply input here
    entity.emitter.on('tick', function() {
      processInput();
      updateAnimation();
      
      if(instance.region.tick_count % 3*instance.engine.lag == 0) {
        entity.message('input', instance.region.tick_count, entity.position, entity.velocity, entity.getForce('input'));
      }
    });
    
    
    //Handle action press here
    instance.emitter.on('press_action', function(button) {
      var x = entity.position;
      instance.message('voxel', Math.ceil(x[0])+1, Math.floor(x[1]), Math.floor(x[2]));
    });
        
    //Logs a message to the player
    entity.emitter.on('server_log', function(html_str) {
      instance.logHTML(html_str);
    });
  }  
  else {
  
    //Add network delay for player input
    if('engine' in instance) {
      entity.net_delay = instance.engine.lag;
    }
  
    //Tick
    entity.emitter.on('tick', function() {
      updateAnimation();
      
      var input_force = entity.getForce('input');
      
      if(entity.onGround()) {
        for(var i=0; i<3; ++i) {
          if(input_force[i] > 1e-6) {
            input_force[i] = 0.125;
          }
          if(input_force[i] < -1e-6) {
            input_force[i] = -0.125;
          }
        }
      }
      else {
        for(var i=0; i<3; ++i) {
          if(input_force[i] > 1e-6) {
            input_force[i] = 0.01;
          }
          if(input_force[i] < -1e-6) {
            input_force[i] = -0.01;
          }
        }
      }
    });
    
    //Apply a network packet to update player position  
    entity.emitter.on('remote_input', function(player, tick_count, pos, vel, f) {
    
      if(typeof(tick_count) != 'number' ||
         typeof(pos) != 'object' ||
         !(pos instanceof Array) ||
         pos.length < 3 ||
         typeof(vel) != 'object' ||
         !(vel instanceof Array) ||
         vel.length < 3 ||
         typeof(f) != 'object' ||
         !(f instanceof Array) ||
         f.length < 3) {
         
         return;
      }
         
         
    
      tick_count += 10;
      
      var p = physics.getPosition(tick_count, entity.state),
          v = physics.getVelocity(tick_count, entity.state),
          cf = entity.getForce('input'),
          delta = 0,
          v_delta = 0,
          f_delta = 0,
          vmag = 0;
          
      for(var i=0; i<3; ++i) {
        delta = Math.max(delta, Math.abs(p[i] - pos[i]));
        v_delta = Math.max(v_delta, Math.abs(v[i] - vel[i]));
        f_delta = Math.max(f_delta, Math.abs(f[i] - cf[i]));
        vmag = Math.max(vmag, Math.max(Math.abs(v[i]), Math.abs(vel[i])));
      }
      
      if(delta > 2.0*(tick_count - entity.state.motion.start_tick + 1) * (vmag + 1) ||
        tick_count < entity.state.motion.start_tick) {
        
        if(f_delta > 1e-4) {
          entity.setForce('input', f);
        }
        return;
      }
      
      if(Math.max(delta, Math.max(v_delta, f_delta)) > 1e-4) {        
        //Otherwise, just update the position
        entity.state.motion.position = pos;
        entity.state.motion.velocity = vel;
        entity.state.motion.forces.input = f;
        entity.state.motion.start_tick = tick_count;
      }
    });
  }  
};

