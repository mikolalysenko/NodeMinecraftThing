exports.region_name = "Starting Area";

exports.registerInstance = function(inst) {

var instance  = inst,
    region    = inst.region,
    emitter   = inst.emitter;

emitter.on('construct', function() {
  
  for(var i=-30; i<=30; ++i)
  for(var j=-30; j<=30; ++j) {
    instance.setVoxel(i, -5, j, 2);
  }
  
  
  for(var i=0; i<40; ++i) { 
    instance.createEntity({
      type:'enemy',
      motion:{
        position:[Math.random() * 20 ,Math.random() * 20, Math.random() * 20],
      },
    });
  }
    
});


};




