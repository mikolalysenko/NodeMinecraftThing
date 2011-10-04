var framework = null;
exports.registerFramework = function(f) { framework = f; };

function computeTime(tick_count, state) {
  var dt = tick_count - state.motion_start_tick;
  if(dt < 0) {
    dt = 0;
  }
  return dt;
};

var Models = {

  //Constant model
  constant: {
    getPosition: function(tick_count, state, r) {
      if(!r) {
        return state.slice();
      }
      for(var i=0; i<3; ++i) {
        r[i] = state.motion_position[i];
      }
      return r;
    },
    
    setPosition: function(tick_count, state, p) {
      for(var i=0; i<3; ++i) {
        state.motion_position[i] = p;
      }
      return state.motion_position[i];
    },
    
    getVelocity: function(tick_count, state, r) {
      if(!r) {
        return [0.0,0.0,0.0];
      }
      for(var i=0; i<3; ++i) {
        r[i] = 0.0;
      }
      return r;
    },
    
    setVelocity: function(tick_count, state, v) {
      return [0,0,0];
    },
    
    params: [
      'motion_model',
      'motion_position',
    ],
    
    checkDefaults: function(state) {
      if(!state.motion_position) {
        state.motion_position = [0.0,0.0,0.0];
      }
    },
  },


  linear: {
    getPosition: function(tick_count, state, r) {
      var dt = computeTime(tick_count, state);
      if(!r) {
        r = [0.0,0.0,0.0];
      }
      for(var i=0; i<3; ++i) {
        r[i] = state.motion_position[i] + dt * state.motion_velocity[i];
      }
      return r;
    },
    
    setPosition: function(tick_count, state, p) {
      for(var i=0; i<3; ++i) {
        state.motion_position[i] = p[i];
      }
      state.motion_tick_start = tick_count;
      return state.motion_position;
    },
    
    getVelocity: function(tick_count, state, r) {
      if(!r) {
        return state.motion_velocity.slice();
      }
      for(var i=0; i<3; ++i) {
        r[i] = state.motion_velocity[i];
      }
      return r;
    },
    
    setVelocity: function(tick_count, state, v) {
      Models.linear.getPosition(tick_count, state, state.motion_position);
      for(var i=0; i<3; ++i) {
        state.motion_velocity[i] = v[i];
      }
      state.motion_start_tick = tick_count;
      return state.motion_velocity;
    },
    
    params: [
      'motion_model',
      'motion_position',
      'motion_velocity',
      'motion_start_tick',
    ],
    
    checkDefaults: function(state) {
    
      Models['constant'].checkDefaults(state);
      if(!state.motion_velocity) {
        state.motion_velocity = [0.0,0.0,0.0];
      }
      if(!state.motion_start_tick) {
        state.motion_start_tick = 0;
      }    
    },
  },
  
  /*
  particle: {
    position: function(tick_count, state, r) {
      if(!r) {
        r = [0.0,0.0,0.0];
      }

      var dt = computeTime(tick_count, state),
          a  = state.motion_acceleration,
          v  = state.motion_velocity,
          mu = state.motion_friction,
          p  = state.motion_position;
      for(var i=0; i<3; ++i) {
        r[i] = (a[i] - v[i] * mu[i]) * Math.exp(-mu[i] * t) / (mu[i] * mu[i]) + a[i] / mu[i] + p[i];
      }
      return r;
    },
    

    velocity: function(tick_count, state, r) {
      var dt = computeTime(tick_count, state),
          a  = computeAcceleration(tick_count, state),
          v  = state.velocity,
          mu = state.friction;
      
      for(var i=0; i<3; ++i) {
        r[i]  = (a[i] - (a[i] - v[i] * mu[i]) * Math.exp(-mu[i] * t)) / mu[i];
      }
    },
    
    params: [
      'motion_model',
      'motion_position',
      'motion_velocity',
      'motion_start_tick',
      'motion_friction',
      'motion_forces',
      'motion_mass',
    ],
    
    checkDefaults: function(state) {
      Models['linear'].checkDefaults(state);
      if(!state.motion_friction) {
        state.motion_friction = [0.0,0.0,0.0];
      }
      if(!state.motion_forces) {
        state.motion_forces = [0.0,0.0,0.0];
      }
      if(!state.motion_mass) {
        state.motion_mass = 1.0;
      }
    },
  },
  */
};




//Function for computing position
function getPosition(tick_count, state, r) {
  return Models[state.motion_model].getPosition(tick_count, state, r);
}
function setPosition(tick_count, state, r) {
  return Models[state.motion_model].setPosition(tick_count, state, r);
}
function getVelocity(tick_count, state, r) {
  return Models[state.motion_model].getVelocity(tick_count, state, r);
}
function setVelocity(tick_count, state, r) {
  return Models[state.motion_model].setVelocity(tick_count, state, r);
}
function getMotionParams(state) {
  var params = Models[state.motion_model].params,
      res = {};
  for(var i=0; i<params.length; ++i) {
    res[params[i]] = state[params[i]];
  }
  return res;
}
function setMotionParams(state, motion_params) {
  var params = Models[motion_params.motion_model].params;
  for(var i=0; i<params.length; ++i) {
    state[params[i]] = motion_params[params[i]];
  }
  return state;
}

//Exports for motion accessors
exports.getPosition     = getPosition;
exports.setPosition     = setPosition;
exports.getVelocity     = getVelocity;
exports.setVelocity     = setVelocity;
exports.getMotionParams = getMotionParams;
exports.setMotionParams = setMotionParams;


//Registers instance
exports.registerInstance = function(instance) { };

//Adds position, velocity and orientation to entity
exports.registerEntity = function(entity) {

  //Instance reference
  var instance = entity.instance;
  
  //Set initial position/velocity modifiers
  if(!entity.state.motion_model) {
    entity.state.motion_model = 'linear';
  }
  Models[entity.state.motion_model].checkDefaults(entity.state);
  
  //Add getters/setters
  entity.__defineGetter__('position', function() {
    return getPosition(instance.region.tick_count, entity.state);
  });
  entity.__defineSetter__('position', function(p) {
    return setPosition(instance.region.tick_count, entity.state, p);
  });
  entity.__defineGetter__('velocity', function() {
    return getVelocity(instance.region.tick_count, entity.state);
  });
  entity.__defineSetter__('velocity', function(p) {
    return setVelocity(instance.region.tick_count, entity.state, p);
  });
  entity.__defineGetter__('motion_params', function() {
    return getMotionParams(entity.state);
  });
  entity.__defineSetter__('motion_params', function(p) {
    return setMotionParams(entity.state, p);
  });  
};

