//x,y,width,height[,offset_x, offset_y]
var sprites = {
  'derp0':      [0,0,32,64],
  'derp_idle':  [32,0,32,64],
  'derp_walk0': [64,0,32,64],
  'derp_walk1': [96,0,32,64],
};

var animations = {
  'idle' :  ['derp_idle', 0],
  'walk' :  ['derp_walk0', 1.0/30.0, 'derp_walk1', 1.0/30.0],
};

