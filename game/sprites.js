//Sprite animation declarations


//Define player sprite class
function player_anim() {
  var idle = {
        rect:   [34,0,52,40],
        center: [43,22],
      },
      
      walk1 = {
        rect:   [66,0,84,33],
        center: [75,24],
      },

      walk2 = {
        rect:   [101,3,114,40],
        center: [107,25],
      };
      
  return {
    'idle': {
      loop:   false,
      seq:    [0, idle],
    },
    'walk': {
      loop: true,
      seq:  [5, walk1, 5, walk2],
    },
  };
}


//Export list of sprite classes
exports.sprite_classes = {
  'player' : player_anim(),
};



