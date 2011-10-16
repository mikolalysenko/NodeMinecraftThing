var common = require('./common_framework.js');
for(var i in common) {
  exports[i] = common[i];
}

//Rendering stuff
exports.RenderGL     = require('./rendergl.js').RenderGL,
exports.StandardPass = require('./standard_pass.js').StandardPass;
exports.VoxelPass    = require('./voxel_pass.js').VoxelPass;
exports.SpritePass   = require('./sprite_pass.js').SpritePass;

Object.freeze(this);
Object.freeze(exports);
