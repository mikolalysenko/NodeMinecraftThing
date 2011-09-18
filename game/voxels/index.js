//Voxel terrain texture
exports.voxelTexture = "./voxels/voxels.png";

//Texture order
// -x, +x, -y, +y, -z, +z
exports.voxelTypes = [

  { name:         'Air', 
    transparent:   true, 
    textures:     [ [0,0], [0,0], [0,0], [0,0], [0,0], [0,0] ],
  },
  
  { name:         'Stone', 
    transparent:   true, 
    textures:     [ [0,1], [0,1], [0,1], [0,1], [0,1], [0,1] ],
  },  
];


