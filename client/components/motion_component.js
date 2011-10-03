var framework = null;
exports.registerFramework = function(f) { framework = f; };


function computeTime(tick_count, state) {
  var dt = tick_count - state.motion_start_tick;
  if(dt < 0) {
    dt = 0;
  }
  return dt;
}

//Function for computing position
function computePosition(tick_count, state, r) {
  if(!r) {
    r = [0.0,0.0,0.0];
  }
  
  if(state.motion_model === 'constant') {
    for(var i=0; i<3; ++i) {
      r[i] = position[i];
    }
    return r;
  }
  
  var dt = computeTime(tick_count, state);
  
  if(state.motion_model === 'linear') { 
    for(var i=0; i<3; ++i) {
      r[i] = state.position[i] + dt * state.velocity[i];
    }
  }
  else if(state.motion_model === 'physical') {

    var a  = computeAcceleration(tick_count, state),
        v  = state.velocity,
        mu = state.friction,
        p  = state.position;
    
    for(var i=0; i<3; ++i) {
      r[i] = (a[i] - v[i] * mu[i]) * Math.exp(-mu[i] * t) / (mu[i] * mu[i]) + a[i] / mu[i] + p[i];
    }
  }
  
  return r;
}

function computeVelocity(tick_count, state, r) {
  if(!r) {
    r = [0.0,0.0,0.0];
  }  
  if(state.motion_model === 'constant') {
  }
  else if(state.motion_model === 'linear') {
    for(var i=0; i<3; ++i) {
      r[i] = state.velocity[i];
    }
  }
  else if(state.motion_model === 'physical') {
    var dt = computeTime(tick_count, state),
        a  = computeAcceleration(tick_count, state),
        v  = state.velocity,
        mu = state.friction;
    
    for(var i=0; i<3; ++i) {
      r[i]  = (a[i] - (a[i] - v[i] * mu[i]) * Math.exp(-mu[i] * t)) / mu[i];
    }
  }
  
  return r;
}


function getMotionParams(state) {
  if(state.motion_model === 'constant') {
    return {
      motion_model: state.motion_model,
      position: state.position,
    };
  }
  else if(state.motion_model === 'linear') {
    return {
      motion_model: state.motion_model,
      motion_start_tick: state.motion_start_tick,
      position: state.position,
      velocity: state.velocity,
    };
  }
  else if(state.motion_model === 'physical') {
    return {
      motion_model: state.motion_model,
      motion_start_tick: state.motion_start_tick,
      position: state.position,
      velocity: state.velocity,
      friction: state.friction,
      forces: state.forces,
      mass: state.mass,
    };
  }
}

function setMotionParams(state, motion_params) {
  if(motion_params.motion_model === 'constant') {
    state.motion_model = motion_params.motion_model;
    state.position = motion_params.position;    
  }
  else if(motion_params.motion_model === 'linear') {
    state.motion_model = motion_params.motion_model;
    state.motion_start_tick = motion_params.motion_start_tick;
    state.position = motion_params.position;
    state.velocity = motion_params.velocity;
  }
  else if(motion_params.motion_model === 'physical') {
    state.motion_model = motion_params.motion_model;
    state.motion_start_tick = motion_params.motion_start_tick;
    state.position = motion_params.position;
    state.velocity = motion_params.velocity;
    state.friction = motion_params.friction;
    state.forces = motion_params.forces;
    state.mass = motion_params.mass;
  }
}

function validateMotionParams(motion_params) {
  return true;
}



exports.computePosition = computePosition;
exports.computeVelocity = computeVelocity;
exports.getMotionParams = getMotionParams;
exports.setMotionParams = setMotionParams;
exports.validateMotionParams = validateMotionParams;


//Registers instance
exports.registerInstance = function(instance) { };

//Adds position, velocity and orientation to entity
exports.registerEntity = function(entity) {

  //Instance reference
  var instance = entity.instance;
  
  //Set initial position/velocity modifiers
  if(!entity.state.motion_model) {
    entity.state.motion_model = 'constant';
  }
  if(!entity.state.position) {
    entity.state.position = [0.0,0.0,0.0];
  }
  if(entity.state.motion_model === 'linear' ||
     entity.state.motion_model === 'physical' ) {
    if(!entity.state.velocity) {
      entity.state.velocity = [0.0,0.0,0.0];
    }
    if(!entity.state.motion_start_tick) {
      entity.state.motion_start_tick = 0;
    }
    if(entity.state.motion_model === 'physical') {
      if(!entity.state.friction) {
        entity.state.friction = [0.0,0.0,0.0];
      }
      if(!entity.state.forces) {
        entity.state.forces = [0.0,0.0,0.0];
      }
      if(!entity.state.mass) {
        entity.state.mass = 1.0;
      }
    }
  }
  
  //Retrieves the position at a tick (if specified)
  entity.position = function(r) {
    return computePosition(instance.region.tick_count, entity.state, r);
  }
  
  //Retrieves entity velocity
  entity.velocity = function(r) {
    return computeVelocity(instance.region.tick_count, entity.state, r);
  }

  //Sets entity position
  entity.setPosition = function(p) {
    var v = computeVelocity(instance.region.tick_count, entity.state);
    for(var i=0; i<3; ++i) {
      entity.position[i] = p[i];
      entity.velocity[i] = v[i];
    }
    entity.state.motion_start_tick = instance.region.tick_count;
  }
  
  //Sets the entity velocity
  entity.setVelocity = function(v) {
    if(entity.state.motion_model === 'constant') {
      return;
    }
    var p = computePosition(instance.region.tick_count, entity.state);
    for(var i=0; i<3; ++i) {
      entity.position[i] = p[i];
      entity.velocity[i] = v[i];
    }
    entity.state.motion_start_tick = instance.region.tick_count;
  }
  
  //Retrieves motion parameters
  entity.getMotionParams = function() {
    return getMotionParams(entity.state);
  }
  
  //Sets the entity motion
  entity.setMotionParams = function(params) {
    setMotionParams(entity.state, params);
  }
};

