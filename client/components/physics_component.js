"use strict";

var linalg = require('../linalg.js'),
    patcher = require('patcher');


var STICK_THRESHOLD = 1.0,
    CONTACT_THRESHOLD = 0.01,
    PRECISION       = 65536.0,
    TOLERANCE       = 1e-6,
    COLLIDE_NONE    = 0,
    COLLIDE_STICK   = 1,
    COLLIDE_BOUNCE  = 2,
    COLLIDE_REST    = 3;


var parameter_names = [
  'flags',
  'aabb',
  'position',
  'velocity',
  'start_tick',
  'air_friction',
  'forces',
  'contacts',
  'mass',
  'restitution',
];

function checkDefaults(state) {
  if(!state.flags) {
    state.flags = {};
  }
  if(!state.aabb) {
    state.aabb = [1.0,1.0,1.0];
  }
  if(!state.start_tick) {
    state.start_tick = 0;
  }
  if(!state.position) {
    state.position = [0.0,0.0,0.0];
  }
  if(!state.velocity) {
    state.velocity = [0.0,0.0,0.0];
  }
  if(!state.air_friction) {
    state.air_friction = 0.0;
  }
  if(!state.forces) {
    state.forces = {};
  }
  if(!state.contacts) {
    state.contacts = {};
  }
  if(!state.mass) {
    state.mass = 1.0;
  }
  if(!state.restitution) {
    state.restitution = 1.0;
  }
};

var framework = null;
exports.registerFramework = function(f) { framework = f; };

function computeTime(tick_count, state) {
  return Math.max(tick_count - state.start_tick, 0);
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

function quantize(f) {
  return Math.round(f*PRECISION) / PRECISION;
}

function quantize_vec(f) {
  for(var i=0; i<3; ++i) {
    f[i] = quantize(f[i]);
  }
}

function getPosition(tick_count, state, r) {
  if(!r) {
    r = [0.0,0.0,0.0];
  }
  var t  = computeTime(tick_count, state),
      a   = [0.0,0.0,0.0],
      mu  = getPhysicalParams(state, a),
      v  = state.velocity,
      p  = state.position;
 
  if(mu < TOLERANCE) {
    for(var i=0; i<3; ++i) {
      r[i] = (v[i] + 0.5*a[i]*t)*t + p[i];
    }
  }
  else {
    var f = 1.0 - Math.exp(-mu*t),
        u = -1.0/mu;
    for(var i=0; i<3; ++i) {
      r[i] = (a[i]*u - v[i])*u*f - a[i]*t*u + p[i];
    }
  }
  
  return r;
};

function setPosition(tick_count, state, p) {
  getVelocity(tick_count, state, state.velocity);
  
  for(var i=0; i<3; ++i) {
    state.position[i] = p[i];
  }
  state.start_tick = tick_count;
  return p;
};

function getVelocity(tick_count, state, r) {
  if(!r) {
    r = [0.0,0.0,0.0];
  }
  var t  = computeTime(tick_count, state),
      a   = [0.0,0.0,0.0],
      mu  = getPhysicalParams(state, a),
      v  = state.velocity;
      
  if(mu < TOLERANCE) {
    for(var i=0; i<3; ++i) {
      r[i] = a[i] * t + v[i];
    }
  }
  else {
    var f = Math.exp(-mu * t),
        u = 1.0/mu;
    for(var i=0; i<3; ++i) {
      r[i] = -((a[i] - v[i]*mu)*f - a[i]) * u;
    }
  }
  return r;
};

function setVelocity(tick_count, state, v) {
  getPosition(tick_count, state, state.position);
  for(var i=0; i<3; ++i) {
    state.velocity[i] = v[i];
  }
  state.start_tick = tick_count;
  return v;
};


function getPhysicalParams(state, f_total) {
  for(var n in state.forces) {
    var f = state.forces[n];
    for(var i=0; i<3; ++i) {
      f_total[i] += f[i];
    }
  }
  
  //Apply contact constraints and compute friction
  var friction = state.air_friction;
  for(var c in state.contacts) {
    var contact = state.contacts[c],
        nf = 0.0;
    
    friction = Math.max(friction, contact[4]);
    for(var i=0; i<3; ++i) {
      nf += f_total[i] * contact[i];
    }
    if(nf > TOLERANCE) {
      continue;
    }
    
    for(var i=0; i<3; ++i) {
      f_total[i] -= nf * contact[i];
    }
  }
  
  //Compute acceleration
  var mass_recip = 1.0/state.mass;
  for(var i=0; i<3; ++i) {
    f_total[i] *= mass_recip;
  }
  
  return friction;
};

function fastForward(tick_count, state) {
  getPosition(tick_count, state, state.position);
  getVelocity(tick_count, state, state.velocity);
  
  //console.log("Fast forward velocity: ", state.velocity, state.position);

  state.start_tick = tick_count;
};

function getMotionParams(state) {
  var res = {};
  for(var i=0; i<parameter_names.length; ++i) {
    res[parameter_names[i]] = state[parameter_names[i]];
  }
  return res;
}

function setMotionParams(state, motion_params) {
  for(var i=0; i<parameter_names.length; ++i) {
    if(typeof(state[parameter_names[i]]) == 'object') {
      patcher.assign(state[parameter_names[i]], motion_params[parameter_names[i]]);
    }
    else {
      state[parameter_names[i]] = motion_params[parameter_names[i]];
    }
  }
  return state;
}


//Exports for motion accessors
exports.getPosition     = function(t, s, r) {
  if(s.motion.local_position) {
    if(!r) {
      r = [0,0,0];
    }
    for(var i=0; i<3; ++i) {
      r[i] = s.motion.local_position[i];
    }
    return r;
  }
  console.log("here!!!");
  return getPosition(t, s.motion, r);
};

exports.getVelocity     = function(t, s, r) {
  if(s.motion.local_velocity) {
    if(!r) {
      r = [0,0,0];
    }
    for(var i=0; i<3; ++i) {
      r[i] = s.motion.local_velocity[i];
    }
    return r;
  }
  return getVelocity(t, s.motion, r);  
};


function applyCollision(tick_count, state1, state2, constraintPlane) {

  var p0    = getPosition(tick_count, state1),
      p1    = getPosition(tick_count+1, state1),
      q0    = getPosition(tick_count, state2),
      q1    = getPosition(tick_count+1, state2);

  //Estimate time of intersection
  var d0 = 0.0, d1 = 0.0;
  for(var i=0; i<3; ++i) {
    d0 += (p0[i] - q0[i]) * constraintPlane[i];
    d1 += (p1[i] - q1[i]) * constraintPlane[i];
  }
  
  //console.log("Applying collision", d0, d1, constraintPlane, p0, p1, q0, q1);
  
  
  //If object doesn't collide, then ignore this
  if((d0 + constraintPlane[3] > CONTACT_THRESHOLD && d1 + constraintPlane[3] > CONTACT_THRESHOLD)) {
    //console.log("No collision");
    return COLLIDE_NONE;
  }
  
  //Compute time of impact
  var t = -1e6,
      pt = p1, 
      qt = q1;
  
  if(Math.abs(d1 - d0) > TOLERANCE) {
    t = -(constraintPlane[3] + d0) / (d1 - d0);
  }

  //console.log("t = ", t);
  
  if(Math.abs(t) < 100.0) {
  
    //Solve for position using linear model :p
    for(var i=0; i<3; ++i) {
      pt[i] = (1.0-t)*p0[i] + t*p1[i];
      qt[i] = (1.0-t)*q0[i] + t*q1[i];
    }
  }
  else {
    
    for(var i=0; i<3; ++i) {
      pt[i] = p0[i]; //- (d0 + constraintPlane[3]) * constraintPlane[i];
      qt[i] = q0[i];
    }
  }
  
  //Get parameters
  var cr  = Math.min(state1.restitution, state2.restitution),
      vp  = getVelocity(tick_count, state1),
      mp  = state1.mass,
      vq  = getVelocity(tick_count, state2),
      mq  = state2.mass,
      vc  = [0.0,0,0.0,0.0],
      mr  = 1.0 / (mp + mq),
      up  = [0.0,0.0,0.0],
      np  = 0.0,
      uq  = [0.0,0.0,0.0],
      nq  = 0.0,
      fp  = 0.0,
      fq  = 0.0;
  
  //Accumulate forces
  for(var id in state1.forces) {
    var f = state1.forces[id];
    for(var i=0; i<3; ++i) {
      fp += constraintPlane[i] * f[i];
    }
  }
  fp /= mp;
  for(var id in state2.forces) {
    var f = state2.forces[id];
    for(var i=0; i<3; ++i) {
      fq += constraintPlane[i] * f[i];
    }
  }
  fq /= mq;

  //Compute velocity in center-of-momentum frame
  for(var i=0; i<3; ++i) {
    vc[i] =   (mp * vp[i] + mq * vq[i]) * mr;
    up[i] =   vp[i] - vc[i];
    np    +=  up[i] * constraintPlane[i];
    uq[i] =   vq[i] - vc[i];
    nq    +=  uq[i] * constraintPlane[i];
  }
    
  //Check for sticking
  var stick = false;

  //Check if moving towards separation already
  if(Math.abs(np - nq)*cr < STICK_THRESHOLD * (Math.abs(fp) + Math.abs(fq))) {
    cr = 0.0;
    stick = true;
  }
  
  //Don't bounce if already separated
  if(!stick && np - nq > 0) {
    cr = -1.0;
  }

  //console.log("vp=", vp, "np=", np, "cr=", cr);
  
  //Compute new velocity
  for(var i=0; i<3; ++i) {
    up[i] += -(1.0 + cr) * np * constraintPlane[i] + vc[i];
    uq[i] += -(1.0 + cr) * nq * constraintPlane[i] + vc[i];
  }
  
  //console.log("vpf=", vp);
  
  var delta_p = 0, delta_q = 0;
  for(var i=0; i<3; ++i) {
    delta_p = Math.max(Math.max(delta_p, 
              Math.abs(pt[i] - p0[i])),
              Math.abs(vp[i] - up[i]));
              
    delta_q = Math.max(Math.max(delta_q, 
              Math.abs(qt[i] - q0[i])),
              Math.abs(vq[i] - uq[i]));
  }
  
  //console.log("p0=", p0, "pt=", pt);
  
  if(delta_p > TOLERANCE) {
    state1.start_tick = tick_count;
    
    for(var i=0; i<3; ++i) {
      state1.position[i] = pt[i];
      state1.velocity[i] = up[i];
    }
  }
  
  if(delta_q > TOLERANCE) {
    state2.start_tick = tick_count;
    
    for(var i=0; i<3; ++i) {
      state2.position[i] = qt[i];
      state2.velocity[i] = uq[i];
    }
  }
  
  return stick ? COLLIDE_STICK : COLLIDE_BOUNCE;
}



//Registers instance
exports.registerInstance = function(instance) { };

//Adds position, velocity and orientation to entity
exports.registerEntity = function(entity) {

  console.log("Physics component attaching to entity:", entity.state._id);

  //Instance reference
  var instance = entity.instance;
  
  //Set initial position/velocity modifiers
  if(!entity.state.motion) {
    entity.state.motion = {};
  }
  checkDefaults(entity.state.motion);
  
  
  
  console.log("entity state = ", entity.state.motion);
  
  var predicted_p = [0.0,0.0,0.0],
      last_position = [0.0,0.0,0.0],
      last_velocity = [0.0,0.0,0.0],
      interpolate_time = -1;
  
  
  //Add getters/setters
  entity.__defineGetter__('position', function() {
    return getPosition(instance.region.tick_count, entity.state.motion);
  });
  entity.__defineSetter__('position', function(p) {
    var r = setPosition(instance.region.tick_count, entity.state.motion, p);
    for(var i=0; i<3; ++i) {
      predicted_p[i] = p[i];
    }
    for(var i in entity.state.motion.contacts) {
      delete entity.state.motion.contacts[i];
    }
    return r;
  });
  entity.__defineGetter__('velocity', function() {
    return getVelocity(instance.region.tick_count, entity.state.motion);
  });
  entity.__defineSetter__('velocity', function(p) {
    return setVelocity(instance.region.tick_count, entity.state.motion, p);
  });
  entity.__defineGetter__('motion_params', function() {
    return getMotionParams(entity.state.motion);
  });
  entity.__defineSetter__('motion_params', function(p) {
    var r = setMotionParams(entity.state.motion, p);
    /*
        pos = entity.position;
    for(var i=0; i<3; ++i) {
      predicted_p[i] = pos[i];
    }
    */
    return r;
  });
  
  entity.setForce = function(force_name, vec) {
    fastForward(instance.region.tick_count+1, entity.state.motion);
    entity.state.motion.forces[force_name] = vec;
  };
  
  entity.getForce = function(force_name, vec) {
    var f = entity.state.motion.forces[force_name];
    if(f) {
      return f;
    }
    return [0.0,0.0,0.0];
  };
  
  entity.onGround = function() {
    var contacts = entity.state.motion.contacts;
    for(var i in contacts) {
      if(contacts[i][1] > 0.5) {
        return true;
      }
    }
    return false;
  };
  
  entity.applyImpulse = function(delta_v) {
  
    console.log("applying impulse:", getPosition(instance.region.tick_count, entity.state.motion));
  
    var v = getVelocity(instance.region.tick_count, entity.state.motion);
    for(var i=0; i<3; ++i) {
      v[i] += delta_v[i];
    }
    setVelocity(instance.region.tick_count, entity.state.motion, v);

    console.log("new position:", getPosition(instance.region.tick_count, entity.state.motion));

  };
  
  if(instance.client && entity.net_relevant) {
  
    entity.state.motion.local_position = [0,0,0];
    entity.state.motion.local_velocity = [0,0,0];

    
    var engine = instance.engine;
    entity.emitter.on('net_update', function(net_state, overrides) {
    
      if(entity.net_delay < 0) {
        //FIXME: Check if local position is acceptable
        var m = framework.patcher.clone(entity.state.motion);
        overrides.push(function() {
          framework.patcher.assign(entity.state.motion, m);
        });      
      }
      else {
      
        //HACK:  Fix net state clearing out local variable
        entity.net_state.motion.local_position = [0,0,0];
        entity.net_state.motion.local_velocity = [0,0,0];
        for(var i=0; i<3; ++i) {
          entity.net_state.motion.local_position[i] = entity.state.motion.local_position[i];
          entity.net_state.motion.local_velocity[i] = entity.state.motion.local_velocity[i];
        }
        
        if(interpolate_time <= 0) {
          getPosition(instance.region.tick_count, entity.state.motion, last_position);
          getVelocity(instance.region.tick_count, entity.state.motion, last_velocity);
        }
        else {
          for(var i=0; i<3; ++i) {
            last_position[i] = entity.state.motion.local_position[i];
            last_velocity[i] = entity.state.motion.local_velocity[i];
          }
        }
        interpolate_time = engine.lag;
        
        overrides.push(function() {
          //getPosition(instance.region.tick_count, entity.state.motion, predicted_p);
        });
      }
    });
  }        


  if(!('gravity' in entity.state.motion.forces)) {
    entity.setForce('gravity', [0,-0.1,0]);
  }
  
  
  var desync_frames = 0;
  
    
  var voxel_types = instance.game_module.voxel_types;
  entity.emitter.on('tick', function() {
  
  
    //Check for level collisions
    var p     = getPosition(instance.region.tick_count, entity.state.motion),
        pfut  = getPosition(instance.region.tick_count+1, entity.state.motion),
        aabb = entity.state.motion.aabb,
        plo = [0,0,0],
        phi = [0,0,0],
        lo = [0,0,0],
        hi = [0,0,0];
        
    
    //Check for position correction
    if(instance.client) {
    
      var net_p = getPosition(instance.region.tick_count, entity.net_state.motion),
          net_v = getVelocity(instance.region.tick_count, entity.net_state.motion),
          v = entity.velocity,
          delta = 0.0,
          vmag = 0.0;
      
      for(var i=0; i<3; ++i) {
        delta = Math.max(delta, Math.abs(net_p[i] - p[i]));
        vmag = Math.max(vmag, Math.max(Math.abs(v[i]), Math.abs(net_v[i])));
      }
      
      //Correct position if out of sync
      if(delta > 5.0 * (vmag + 1)) {
        ++desync_frames;
        if(desync_frames > 6*instance.engine.lag) {
        
          getPosition(instance.region.tick_count, entity.state.motion, last_position);
          getVelocity(instance.region.tick_count, entity.state.motion, last_velocity);
          patcher.assign(entity.state.motion, entity.net_state.motion);
          
          interpolate_time = instance.engine.lag;
        }
      }
      else {
        desync_frames = 0;
      }
    }    

    
    //console.log("tick: c=" + p[0] + ',' + p[1] + ',' + p[2] + ", n=" +pfut[0]  + ',' + pfut[1]  + ',' + pfut[2]);
    
    //console.log("tick_count = ", instance.region.tick_count);
    //console.log("Initial state", JSON.stringify(entity.state.motion));
    //console.log("Collide start", p, pfut);
    for(var i=0; i<3; ++i) {
      plo[i] = Math.min(Math.min(predicted_p[i], p[i]), pfut[i]) - 0.5*aabb[i];
      phi[i] = Math.max(Math.max(predicted_p[i], p[i]), pfut[i]) + 0.5*aabb[i];
      lo[i] = Math.floor(plo[i] - 1);
      hi[i] = Math.ceil(phi[i] + 1);
    }
    
    //Generate contact list
    var air_friction = 0.0,
        delta  = [1,9,3],
        center = 1+3+9,
        contact_list = [];
    instance.voxelForeach(lo, hi, 1, function(x, y, z, wind, step) {
    
      var voxel = voxel_types[wind[center]],
          cr = voxel.restitution,
          mu = voxel.friction;
      
      if(voxel.solid) {
        var vlo = [x,y,z],
            vhi = [x+step, y+1, z+1],
            sep_axis = 0, sep_sign = 1, sep_dist = -1e6, cross_dist = -1e6;
        
        for(var i=0; i<3; ++i) {
          cross_dist = Math.max(cross_dist, 
                       Math.max(vlo[i] - phi[i],
                                plo[i] - vhi[i]));
                                
          var d0 = vlo[i] - predicted_p[i] - 0.5 * aabb[i],
              d1 = predicted_p[i] - vhi[i] - 0.5 * aabb[i];
          
          //console.log(i +","+ d0 +","+ d1 +","+ vlo[i] +","+ cross_dist);
          
          if(d0 > d1) {
            if(!voxel_types[wind[center - delta[i]]].solid) {
              if(d0 > sep_dist) {
                sep_dist = d0;
                sep_axis = i;
                sep_sign = -1;
              }
            }
          }
          else {
            if(!voxel_types[wind[center + delta[i]]].solid) {
              if(d1 > sep_dist) {
                sep_dist = d1;
                sep_axis = i;
                sep_sign = 1;
              }
            }
          }
        }
        
        //Check if box crosses
        if(cross_dist > CONTACT_THRESHOLD ||
           cross_dist <= -1e5 ||
           sep_dist   <= -1e5) {
          return;
        }
        
        //console.log("Possible collision:", x, y, z, sep_axis, sep_sign, sep_dist, cross_dist);

        //Construct separator
        var pldist = sep_sign < 0 ? vlo[sep_axis] : vhi[sep_axis],
            pl = [0,0,0,-sep_sign*pldist, mu];
        pl[sep_axis] = sep_sign;
        pl[3] -= 0.5 * aabb[sep_axis];
        
        var d = pl[0]*predicted_p[0] + pl[1]*predicted_p[1] + pl[2]*predicted_p[2] + pl[3];
        
        //If bbox crosses, but constraint is not violated, then ignore it
        if( d > CONTACT_THRESHOLD && 
            pl[0]*p[0] + pl[1]*p[1] + pl[2]*p[2] + pl[3] > CONTACT_THRESHOLD &&
            pl[0]*pfut[0] + pl[1]*pfut[1] + pl[2]*pfut[2] + pl[3] > CONTACT_THRESHOLD ) {
          return;
        }

        contact_list.push([d, pl, 'l'+(sep_sign*(sep_axis+1))+':'+pldist, cr])
      }
      else {
        air_friction = Math.max(air_friction, mu);
      }
    });
    
    
    var ground_contacts = {};
        
    if(contact_list.length > 0) {
      //Sort contacts by distance
      contact_list.sort(function(a,b) {
        return a[0] < b[0];
      });
      
      //console.log("Processing contacts:", contact_list, p);
      
      //Process contacts in order
      for(var i=0; i<contact_list.length; ++i) {
        var cont = contact_list[i],
            pl = cont[1],
            contact_name = cont[2],
            cr = cont[3],
            mu = pl[4];
            
        //console.log(cont);    
        
        if(i>0 && contact_name === contact_list[i-1][2]) {
          continue;
        }
        
        var p = entity.position,
            d = pl[0] * p[0] + pl[1] * p[1] + pl[2] * p[2] + pl[3];

        if( Math.abs(d) <= CONTACT_THRESHOLD && contact_name in entity.state.motion.contacts ) {
          //console.log("Contact active", d, cont);
          ground_contacts[contact_name] = true;
          continue;
        }
        
        //Apply collision
        var res = applyCollision(instance.region.tick_count, entity.state.motion, {
            position: [0,0,0],
            velocity: [0,0,0],
            start_tick: 1,
            restitution: cr,
            air_friction: 0,
            forces: {},
            mass: 10000.0,
          }, pl);
        
        if(res === COLLIDE_STICK) {
          //console.log("Adding contact,", d, cont);
          ground_contacts[contact_name] = true;
          entity.state.motion.contacts[contact_name] = pl;
        }
        else if(res === COLLIDE_BOUNCE) {
          //console.log("Bounced", d, cont);
        }
        else {
          //console.log("Constraint not active", d, cont);
        }
        /*
        else if(contact_name in ground_contacts) {
          delete ground_contacts[contact_name];
        }
        */
      }
    }
          
    //Update air friction if necessary
    if(entity.state.motion.air_friction !== air_friction) {
      fastForward(instance.region.tick_count+1, entity.state.motion);
      entity.state.motion.air_friction = air_friction;
    }
    
    //Prune out broken contacts
    var contacts = entity.state.motion.contacts,
        broken_contacts = [];
    for(var id in contacts) {
      if(id.charAt(0) === 'l' && !(id in ground_contacts)) {
        broken_contacts.push(id);
      }
    }
    if(broken_contacts.length > 0) {
      fastForward(instance.region.tick_count+1, entity.state.motion);
      for(var i=0; i<broken_contacts.length; ++i) {
        delete entity.state.motion.contacts[broken_contacts[i]];
      }
    }
    
    //Get predicted position
    getPosition(instance.region.tick_count+1, entity.state.motion, predicted_p);
        
    //Quantize state
    quantize_vec(entity.state.motion.position);
    quantize_vec(entity.state.motion.velocity);
    
    //Client side interpolation
    if( instance.client ) {
    
    
      --interpolate_time;   
      if(interpolate_time > 0) {
        var p = getPosition(instance.region.tick_count+1, entity.state.motion),
            v = getVelocity(instance.region.tick_count+1, entity.state.motion),
            t = 1.0 - interpolate_time/(instance.engine.lag);

        linalg.hermite(last_position, last_velocity, p, v, t, entity.state.motion.local_position);
        linalg.dhermite(last_position, last_velocity, p, v, t, entity.state.motion.local_velocity);
        
        
        var delta = 0.0;
        for(var i=0; i<3; ++i) {
          delta = Math.max(delta, Math.abs(entity.state.motion.local_position[i] - p[i]));
        }
        if(delta < 0.02) {
          interpolate_time = 0;
        }
      } 
      else {
        getPosition(instance.region.tick_count+1, entity.state.motion, entity.state.motion.local_position);
        getVelocity(instance.region.tick_count+1, entity.state.motion, entity.state.motion.local_velocity);
        
        for(var i=0; i<3; ++i) {
          last_position[i] = entity.state.motion.local_position[i];
          last_velocity[i] = entity.state.motion.local_velocity[i];
        }
      }
    }


    
    //console.log("Predicted p = ", pfut, getPosition(instance.region.tick_count+1, entity.state.motion));
    //console.log("Final state=", JSON.stringify(entity.state.motion));
  });
  
  
  //Retrieve latest position
  getPosition(instance.region.tick_count, entity.state.motion, predicted_p);
};

