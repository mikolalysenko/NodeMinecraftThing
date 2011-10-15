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

  var jumping = false;


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
    entity.net_delay = -instance.engine.lag;
  
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
      
      
      jumped = buttons['jump'] > 0;
           
      //Update entity velocity         
      var v = entity.getForce('input');
      if(v[0] != nx || v[1] != ny || v[2] != nz || jumped != jumping) {
        jumping = jumped;
        entity.setForce('input', [nx, ny, nz]);
        entity.message('input', instance.region.tick_count + instance.engine.lag, entity.position, entity.velocity, [nx,ny,nz], jumping);
      }
      
      if(entity.onGround() && jumping) {
        entity.applyImpulse([0,3,0]);
      }
    };
    
    function checkPosition() {
      return true;
    }
    
    //Apply input here
    var tick_num = Math.floor(Math.random() * 15)
    entity.emitter.on('tick', function() {
      processInput();
      updateAnimation();
      
      if(instance.region.tick_count % 15 == tick_num) {
        entity.message('input', instance.region.tick_count + instance.engine.lag, entity.position, entity.velocity, entity.getForce('input'), jumping);
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
  
    function fixupForce(input_force) {
      var need_fixup = false,
          fmag = entity.onGround() ? 0.125 : 0.01;
    
      for(var i=0; i<3; ++i) {
        if(input_force[i] > 1e-6 && input_force[i] != fmag) {
          input_force[i] = fmag;
          need_fixup = true;
        }
        if(input_force[i] < -1e-6 && input_force[i] != -fmag) {
          input_force[i] = -fmag;
          need_fixup = true;
        }
      }
      
      return need_fixup;
    };
  
  
    //Add network delay for player input
    if('engine' in instance) {
      entity.net_delay = instance.engine.lag;
    }
    
    
    var movement_buffer = [];
    
    //Apply a network packet to update player position
    entity.emitter.on('remote_input', function(player, tick_count, pos, vel, f, jump_state) {
    
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
      
      movement_buffer.push([tick_count, pos, vel, f, jump_state]);
    });

    
  
    //Tick
    entity.emitter.on('tick', function() {
    
      for(var j=0; j<movement_buffer.length; ++j) {
        if(movement_buffer[j][0] <= instance.region.tick_count) {
        
          var cmd = movement_buffer[j];
          movement_buffer[j] = movement_buffer[movement_buffer.length - 1];
          --movement_buffer.length;
          --j;

          var tick_count = cmd[0],
              pos = cmd[1],
              vel = cmd[2],
              f = cmd[3],
              jump_state = cmd[4],
              p = entity.position,
              v = entity.velocity,
              cf = entity.getForce('input'),
              delta = 0,
              v_delta = 0,
              f_delta = 0,
              vmag = 0;
           
          jumping = jump_state;
          fixupForce(f);
              
          for(var i=0; i<3; ++i) {
            delta = Math.max(delta, Math.abs(p[i] - pos[i]));
            v_delta = Math.max(v_delta, Math.abs(v[i] - vel[i]));
            f_delta = Math.max(f_delta, Math.abs(f[i] - cf[i]));
            vmag = Math.max(vmag, Math.max(Math.abs(v[i]), Math.abs(vel[i])));
          }

          if(delta > 20.0 * (vmag + 1) || cmd[0] < entity.state.motion.start_tick) {
            if(f_delta > 1e-6) {
              entity.setForce('input', f);
            }
          }
          else if(Math.max(delta, 20*v_delta, 1000*f_delta) > 0.01) {
            entity.state.motion.position = pos;
            entity.state.motion.velocity = vel;
            entity.state.motion.forces.input = f;
            entity.state.motion.start_tick = tick_count;
          }
        }
      }
    
    
      if(jumping && entity.onGround()) {
        entity.applyImpulse([0,3,0]);
      }
    
      var input_force = entity.getForce('input');
      if(fixupForce(input_force)) {
        entity.setForce('input', input_force);
      }    
      updateAnimation();
      
    });
    
  }  
};

