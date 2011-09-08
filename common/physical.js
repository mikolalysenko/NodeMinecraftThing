//The component for physical objects

function PhysicalComponent() {
  this.entity   = null;
  this.forces   = [0,0,0];
  this.torques  = [0,0,0];
}

PhysicalComponent.prototype.register = function(entity) {
  this.entity = entity;
}

PhysicalComponent.prototype.init = function() {
  var state = this.entity.state;

  //Set default values
  if(!("position" in state)) {
    state["position"] = [0,0,0];
  }
  if(!("rotation" in state)) {
    state["rotation"] = [0,0,0,0];
  }
  if(!("momentum" in state)) {
    state["momentum"] = [0,0,0];
  }
  if(!("angular_momentum" in state)) {
    state["angular_momentum"] = [0,0,0];
  }
  if(!("mass" in state)) {
    state["mass"] = 1;
  }
  if(!("inertia" in state)) {
    state["inertia"] = [1, 1, 1];
  }
}


PhysicalComponent.prototype.recv = function(mesg) {
  if(msg.type == "apply_force") {
  
    for(var i=0; i<3; ++i) {
      
    }
  }
}

PhysicalComponent.prototype.tick = function() {
  //Integrate entity one time step
}
