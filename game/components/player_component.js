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


  //Use different event handlers for local player
  var is_local_player = instance.client && 
                        entity === instance.engine.playerEntity();
  if(is_local_player) {
  
    console.log("Registering local player");
        
    var engine = instance.engine;
    
    //Apply input here
    entity.emitter.on('tick', function() {
      var buttons = engine.input.getState();

      for(var i=0; i<3; ++i) {
        entity.state.position[i] += entity.state.velocity[i];
        entity.state.velocity[i] = 0;
      }
      
      if(buttons['up'] > 0) {
        entity.state.velocity[2] -= 0.1;
      }
      if(buttons['down'] > 0) {
        entity.state.velocity[2] += 0.1;
      }
      if(buttons['right'] > 0) {
        entity.state.velocity[0] += 0.1;
      }
      if(buttons['left'] > 0) {
        entity.state.velocity[0] -= 0.1;
      }
      
      //Play animation
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
      
    });
  
    //Correct player's local position
    entity.emitter.on('net_update', function() {
      //Disregard
    });
      
    //Create a packet and pass it to the server  
    entity.emitter.on('get_net_packet', function(cb) {
      var packet = [entity.state.position, entity.state.velocity];
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

      //Play animation
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
    });

    //Apply a network packet to update player position  
    entity.emitter.on('apply_net_packet', function(packet) {
      entity.state.position = packet[0];
      entity.state.velocity = packet[1];
    });
  }  
};

