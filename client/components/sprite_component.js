var sprite_classes = {};

var framework = null;
exports.registerFramework = function(f) { framework = f; };

//Registers instance
exports.registerInstance = function(instance) {
  sprite_classes = instance.game_module.sprite_classes;
};

//Registers an entity
exports.registerEntity = function(entity) {

  var instance = entity.instance;
  if(!instance) {
    return;
  }
  
  //Initialize default variables
  if(!entity.state.sprite_class) {
    if(entity.type.sprite_class) {
      entity.state.sprite_class = entity.type.sprite_class;
    }
    else {
      entity.state.sprite_class = '';
    }
  }
  if(!entity.state.anim) {
    entity.state.anim = 'idle';
  }
  if(!entity.state.anim_start) {
    entity.state.anim_start = 0;
  }
  
  
  //Function for playing an animation
  entity.emitter.on('play_anim', function(anim_name, options) {
  
    entity.state.anim = anim_name;
    entity.state.anim_start = instance.region.tick_count;
  });  
  
  //Use different event handlers for local player
  var is_local = instance.client;
  if(is_local) {
  
    console.log("Registering local entity");
        
    var engine = instance.engine;
    
    entity.emitter.on('draw_sprites', function(frame_tick, render, pass) {
    
      var state = entity.state;
    
      //Look up animation
      var sprite_class = sprite_classes[state.sprite_class];
      if(!sprite_class) {
        console.warn("Missing sprite class: " + state.sprite_class);
        return;
      }
      var animation = sprite_class[state.anim];
      if(!animation) {
        console.warn("Missing anim class: " + state.sprite_class + '.' + state.anim_class);
        return;
      }
      
      //Initialize dp table for binary search later
      var tab = animation.partial_sums;
      if(!tab) {
        animation.partial_sums = new Array((animation.seq.length / 2) + 1);
        tab = animation.partial_sums;
        tab[0] = 0;
        for(var i=0; i<tab.length-1; ++i) {
          tab[i+1] = tab[i] + animation.seq[2*i];
        }
      }
      
      var anim_tick = instance.region.tick_count - entity.state.anim_start + frame_tick,
          pos = framework.tools.renderPosition(entity, frame_tick);
                
      if(animation.loop) {
        var l = tab[tab.length-1],
            n = Math.floor(anim_tick / l);
        anim_tick -= n * l;
      }
      
      //Find frame
      var frame_num = Math.min(2*framework.tools.lower_bound(tab, anim_tick) + 1, 
        animation.seq.length-1);
      pass.drawSprite(pos, animation.seq[frame_num]);
    });
  }  
};

