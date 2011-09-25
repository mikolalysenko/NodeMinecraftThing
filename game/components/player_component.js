var framework = null;
exports.registerFramework = function(f) { framework = f; };


//Registers instance
exports.registerInstance = function(instance) {
  console.log("Registered instance");
};

//Registers an entity
exports.registerEntity = function(entity) {

  var instance = entity.instance;
  if(!instance) {
    return;
  }


  //Use different event handlers for local player
  var is_local_player = instance.client && 
                        entity === instance.engine.playerEntity();
  if(is_local_player) {
  
    console.log("Registering local player");
        
    var engine = instance.engine;
    
    //Apply input here
    entity.emitter.on('tick', function() { 
    });
  
    //Correct player's local position
    entity.emitter.on('net_update', function() {
    });
      
    //Create a packet and pass it to the server  
    entity.emitter.on('get_net_packet', function(cb) {
      var packet = [];
      console.log("Sending input packet: " + JSON.stringify(packet));
      cb([]);
    });
  }  
  else {
  
    console.log("Registering networked player");

    //Apply a network packet to update player position  
    entity.emitter.on('apply_net_packet', function(packet) {
      console.log("Got network packet: " + JSON.stringify(packet));
    });
  }  
};

