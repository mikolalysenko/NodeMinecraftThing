var framework = null;
exports.registerFramework = function(f) { framework = f; };

//Registers instance
exports.registerInstance = function(instance) { };

//Adds position, velocity and orientation to entity
exports.registerEntity = function(entity) {

  //Instance reference
  var instance = entity.instance;
  
  //Set initial position/velocity modifiers
  if(!entity.state.position) {
    entity.state.position = [0,0,0];
  }
  if(!entity.state.velocity) {
    entity.state.velocity = [0,0,0];
  }
  if(!entity.state.motion_start_tick) {
    entity.state.motion_start_tick = 0;
  }
  
  //Retrieves the position at a tick (if specified)
  entity.position = function(r) {
    if(!r) {
      r = [0,0,0];
    }
    var dt = instance.region.tick_count - entity.state.motion_start_tick;
    for(var i=0; i<3; ++i) {
      r[i] = entity.state.position[i] + dt * entity.state.velocity[i];
    }
    return r;
  }
  
  //Retrieves entity velocity
  entity.velocity = function(r) {
    if(!r) {
      return entity.state.velocity.slice();
    }
    for(var i=0; i<3; ++i) {
      r[i] = entity.state.velocity[i];    
    }
    return r;
  }

  entity.setPosition = function(p) {
    for(var i=0; i<3; ++i) {
      entity.position[i] = p[i];
    }
    entity.state.motion_start_tick = instance.region.tick_count;
  }
  
  entity.setVelocity = function(v) {
    var dt = instance.region.tick_count - entity.state.motion_start_tick;
    for(var i=0; i<3; ++i) {
      entity.state.position[i] += dt * entity.state.velocity[i];
      entity.state.velocity[i] = v[i];
    }
    entity.state.motion_start_tick = instance.region.tick_count;
  }
}

