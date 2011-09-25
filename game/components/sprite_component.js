var framework = null;
exports.registerFramework = function(f) { framework = f; };

//Registers instance
exports.registerInstance = function(instance) {
};

//Registers an entity
exports.registerEntity = function(entity) {

  var instance = entity.instance;
  if(!instance) {
    return;
  }
  
  //Use different event handlers for local player
  var is_local = instance.client;
  if(is_local) {
  
    console.log("Registering local entity");
        
    var engine = instance.engine;
    
    entity.emitter.on('draw_sprites', function(t, render, pass) {
    
      var pos = framework.tools.renderPosition(entity, t);
      
      pass.drawSprite(pos, {
        rect:[64,0,96,64],
        center:[16,32],
        scale:4,
      });
      
    });
  }  
};

