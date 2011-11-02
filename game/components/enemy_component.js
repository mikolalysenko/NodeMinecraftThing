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

  entity.state.motion.aabb = [0.5, 0.5, 0.5];

  entity.emitter.on('init', function() {
    entity.setForce('ai', [0,0,0]);
  });

  entity.emitter.on('tick', function() {
    //Do nothing  
  });
};

