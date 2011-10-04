var framework = null;
exports.registerFramework = function(f) { framework = f; };

function computeTime(tick_count, state) {
  var dt = tick_count - state.motion_start_tick;
  if(dt < 0) {
    dt = 0;
  }
  return dt;
};

function getZeroVec(tick_count, state, r) {
  if(!r) {
    return [0.0,0.0,0.0];
  }
  for(var i=0; i<3; ++i) {
    r[i] = 0.0;
  }
  return r;
};

function setZeroVec(tick_count, state, v) {
  return [0.0,0.0,0.0];
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
      return p;
    },
    
    getVelocity:  getZeroVec,
    setVelocity:  setZeroVec,
    getForces:    getZeroVec,
    setForces:    setZeroVec,
    getFriction:  getZeroVec,
    setFriction:  setZeroVec,
    
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
      return p;
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
      return v;
    },

    getForces:    getZeroVec,
    setForces:    setZeroVec,
    getFriction:  getZeroVec,
    setFriction:  setZeroVec,
    
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
  
  physical: {
    getPosition: function(tick_count, state, r) {
      if(!r) {
        r = [0.0,0.0,0.0];
      }
      var t  = computeTime(tick_count, state),
          a  = Models.physical.getAcceleration(tick_count, state),
          v  = state.motion_velocity,
          p  = state.motion_position,
          mu = state.motion_friction;
      for(var i=0; i<3; ++i) {
        if(mu[i] < 1e-6) {
          r[i] = (v[i] + 0.5*a[i]*t)*t + p[i];
        }
        else {
          var f = Math.exp(-mu[i]*t),
              u = -1.0/mu[i],
              h = (a[i]*u-v[i])*u;
              
          r[i] = h*(1.0-f) - a[i]*t*u + p[i];
        }
      }
      return r;
    },
    
    setPosition: function(tick_count, state, p) {
      Models.physical.getVelocity(tick_count, state, Models.physical.motion_velocity);
      for(var i=0; i<3; ++i) {
        state.motion_position[i] = p[i];
      }
      state.motion_tick_start = tick_count;
      return p;
    },

    getVelocity: function(tick_count, state, r) {
      if(!r) {
        r = [0.0,0.0,0.0];
      }
      var t  = computeTime(tick_count, state),
          a  = Models.physical.getAcceleration(tick_count, state),
          v  = state.motion_velocity,
          mu = state.motion_friction;
      for(var i=0; i<3; ++i) {
        if(mu[i] < 1e-6) {
          r[i] = a[i] * t + v[i];
        }
        else {      
          r[i] = -((a[i] - v[i]*mu[i]) * Math.exp(-mu[i]*t) - a[i]) / mu[i];
        }
      }
      return r;
    },
    
    setVelocity: function(tick_count, state, v) {
      Models.physical.setPosition(tick_count, state, Models.physical.motion_position);
      for(var i=0; i<3; ++i) {
        state.motion_velocity[i] = v[i];
      }
      state.motion_tick_start = tick_count;
      return v;
    },
    
    getAcceleration: function(tick_count, state, r) {
      if(!r) {
        r = [0.0,0.0,0.0];
      }
      for(var i=0; i<3; ++i) {
        r[i] = state.motion_forces[i] / state.motion_mass;
      }
      return r;
    },
    
    getForces: function(tick_count, state, r) {
      if(!r) {
        return state.motion_forces.slice();
      }
      for(var i=0; i<3; ++i) {
        r[i] = state.motion_forces[i];
      }
      return r;
    },
    
    setForces: function(tick_count, state, f) {
      Models.physical.getPosition(tick_count, state, state.motion_position);
      Models.physical.getVelocity(tick_count, state, state.motion_velocity);
      state.motion_start_tick = tick_count;
      
      for(var i=0; i<3; ++i) {
        state.motion_forces[i] = f[i];
      }
      return f;
    },
    
    getFriction: function(tick_count, state, r) {
      if(!r) {
        return state.motion_friction.slice();
      }
      for(var i=0; i<3; ++i) {
        r[i] = state.motion_friction[i];
      }
      return r;
    },
    
    setFriction: function(tick_count, state, r) {
      Models.physical.getPosition(tick_count, state, state.motion_position);
      Models.physical.getVelocity(tick_count, state, state.motion_velocity);
      state.motion_start_tick = tick_count;
      
      for(var i=0; i<3; ++i) {
        state.motion_friction[i] = r[i];
      }
      return r;    
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
function getForces(tick_count, state, r) {
  return Models[state.motion_model].getForces(tick_count, state, r);
}
function setForces(tick_count, state, r) {
  return Models[state.motion_model].setForces(tick_count, state, r);
}
function getFriction(tick_count, state, r) {
  return Models[state.motion_model].getFriction(tick_count, state, r);
}
function setFriction(tick_count, state, r) {
  return Models[state.motion_model].setFriction(tick_count, state, r);
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
exports.getForces       = getForces;
exports.setForces       = setForces;
exports.getFriction     = getFriction;
exports.setFriction     = setFriction;
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
  entity.__defineGetter__('forces', function() {
    return getForces(instance.region.tick_count, entity.state);
  });
  entity.__defineSetter__('forces', function(p) {
    return setForces(instance.region.tick_count, entity.state, p);
  });
  entity.__defineGetter__('friction', function() {
    return getFriction(instance.region.tick_count, entity.state);
  });
  entity.__defineSetter__('friction', function(p) {
    return setFriction(instance.region.tick_count, entity.state, p);
  });
  entity.__defineGetter__('motion_params', function() {
    return getMotionParams(entity.state);
  });
  entity.__defineSetter__('motion_params', function(p) {
    return setMotionParams(entity.state, p);
  });  
};

