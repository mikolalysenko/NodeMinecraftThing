exports.region_name = "Starting Area";

exports.register = function(inst) {

var instance  = inst,
    region    = inst.region,
    emitter   = inst.emitter;

emitter.on('construct', function() {
  //Construction
});

emitter.on('init', function() {
  //Instance start up
});

emitter.on('tick', function() {
  //Tick
});

emitter.on('spawn', function(entity) {
  //Entity spawn
});

emitter.on('destroy', function(entity) {
  //Entity destruction
});

emitter.on('join', function(player) {
  //Player join
});

emitter.on('depart', function(player) {
  //Player leave
});


};




