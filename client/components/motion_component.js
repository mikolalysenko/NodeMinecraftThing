var STICK_THRESHOLD = 0.001;

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

  //Non-moving
  none: {
    getPosition: getZeroVec,
    setPosition: setZeroVec,
    getVelocity: getZeroVec,
    setVelocity: setZeroVec,
    params: [ 'motion_model' ],
    checkDefaults: function(state) {
    }
  },

  //Constant model
  constant: {
  
    fastForward: function(tick_count, state) {
      return;
    },
  
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
    
    params: [
      'motion_model',
      'motion_flags',
      'motion_position',
    ],
    
    checkDefaults: function(state) {
      if(!state.motion_position) {
        state.motion_position = [0.0,0.0,0.0];
      }
      if(!state.motion_flags) {
        state.motion_flags = {};
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
    
    fastForward: function(tick_count, state) {
      Models.linear.getPosition(tick_count, state, state.motion_position);
      state.motion_tick_start = tick_count;
    },
      
    params: [
      'motion_model',
      'motion_flags',
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
      for(var n in state.motion_forces) {
        var f = state.motion_forces[n];
        for(var i=0; i<3; ++i) {
          r[i] += f[i];
        }
      }
      for(var i=0; i<3; ++i) {
        r[i] /= state.motion_mass;
      }
      return r;
    },
    
    fastForward: function(tick_count, state) {
      Models.physical.getPosition(tick_count, state, state.motion_position);
      Models.physical.getVelocity(tick_count, state, state.motion_velocity);
      state.motion_start_tick = tick_count;
    },
    
    params: [
      'motion_model',
      'motion_flags',
      'motion_position',
      'motion_velocity',
      'motion_start_tick',
      'motion_friction',
      'motion_forces',
      'motion_mass',
      'motion_restitution',
    ],
    
    checkDefaults: function(state) {
      Models['linear'].checkDefaults(state);
      if(!state.motion_friction) {
        state.motion_friction = [0.0,0.0,0.0];
      }
      if(!state.motion_forces) {
        state.motion_forces = {};
      }
      if(!state.motion_mass) {
        state.motion_mass = 1.0;
      }
      if(!state.motion_restitution) {
        state.motion_restitution = 1.0;
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
function fastForward(tick_count, state) {
  if(state.motion_start_tick < tick_count) {
    Models[state.motion_model].fastForward(tick_count, state);
  }
}

//Exports for motion accessors
exports.getPosition     = getPosition;
exports.setPosition     = setPosition;
exports.getVelocity     = getVelocity;
exports.setVelocity     = setVelocity;
exports.getMotionParams = getMotionParams;
exports.setMotionParams = setMotionParams;


function applyCollision(tick_count, state1, state2, constraintPlane) {

  var p0    = getPosition(tick_count-1, state1),
      p1    = getPosition(tick_count,   state1),
      q0    = getPosition(tick_count-1, state2),
      q1    = getPosition(tick_count,   state2);

  //Estimate time of intersection
  var d0 = 0.0, d1 = 0.0;
  for(var i=0; i<3; ++i) {
    d0 += (q0[i] - p0[i]) * constraintPlane[i];
    d1 += (q1[i] - p1[i]) * constraintPlane[i];
  }
  
  //Do not apply constraint if it never gets busted
  if(d1 < d0 || d0 >= constraintPlane[3]) {
    return;
  }
  
  //Compute new velocities
  var t   = Math.min(Math.max((constraintPlane[3] - d1) / (d0 - d1), 0.0), 1.0),
      cr  = Math.min(state1.motion_restitution, state2.motion_restitution),
      mu  = Math.max(state1.motion_body_friction, state2.motion_body_friction),
      vp  = getVelocity(tick_count + t, state1),
      mp  = state1.motion_mass,
      vq  = getVelocity(tick_count + t, state2),
      mq  = state2.motion_mass,
      vc  = [0.0,0,0.0,0.0],
      mr  = 1.0 / (mp + mq),
      up  = [0.0,0.0,0.0],
      np  = 0.0,
      uq  = [0.0,0.0,0.0],
      nq  = 0.0;

  //Fast forward position to point of impact
  getPosition(tick_count+1.0-t, state1, state1.motion_position);
  getPosition(tick_count+1.0-t, state2, state2.motion_position);
  
  for(var i=0; i<3; ++i) {
    vc[i] =   (mp * vp[i] + mq * vq[i]) * mr;
    up[i] =   vp[i] - vc[i];
    np    +=  up[i] * constraintPlane[i];
    uq[i] =   vq[i] - vc[i];
    nq    +=  uq[i] * constraintPlane[i];
  }
  
  //Check for sticking
  if(abs(np - nq) < STICK_THRESHOLD) {
    np = 0.0;
    nq = 0.0;
  }
  
  //Compute new velocity
  for(var i=0; i<3; ++i) {
    state1.motion_velocity[i] = (1.0 - mu) * up[i] + mu * uq[i] + ( (mu - 1.0 - cr) * np - mu * nq ) * n[i] + vc[i];
    state2.motion_velocity[i] = (1.0 - mu) * uq[i] + mu * up[i] + ( (mu - 1.0 - cr) * nq - mu * np ) * n[i] + vc[i];
  }
  
  state1.motion_start_tick = tick_count+1.0-t;
  state2.motion_start_tick = tick_count+1.0-t;
  
  fastForward(tick_count, state1);
  fastForward(tick_count, state2);
}



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

  entity.setForce = function(force_name, vec) {
    fastForward(instance.region.tick_count, entity.state);
    entity.state.motion_forces[force_name] = vec;
  };
  
  entity.getForce = function(force_name, vec) {
    var f = entity.state.motion_forces[force_name];
    if(f) {
      return f;
    }
    return [0.0,0.0,0.0];
  };
};

