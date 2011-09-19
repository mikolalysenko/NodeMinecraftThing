//----------------------------------------------------------------
// Called when a player is created within an instance
//----------------------------------------------------------------
//Called when a player joins an instance
exports.registerPlayer = function(player) {
};


//----------------------------------------------------------------
// Game rules for an instance
//----------------------------------------------------------------
exports.registerInstance = function(instance) {

var region    = instance.region,
    emitter   = instance.emitter;
    
emitter.on('construct', function() {
  //Called first time an instance is constructed
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

//----------------------------------------------------------------
//Called when an entity is created
//----------------------------------------------------------------
exports.registerEntity = function(entity) {
};

