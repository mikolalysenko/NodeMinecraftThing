var process   = require("process"),
    mongodb   = require("mongodb"),
    DNode     = require("dnode"),
    createInstance = require("./instance.js").createInstance;


//Parse out arguments
var listen_portnum  = argv[2],
    db_name         = argv[3],
    db_server       = argv[4],
    db_port         = argv[5];

//Database connection and instances
var db = new mongodb.Db(db_name, new mongodb.Server(db_server, db_port, {}), {});
var instances = {};


//Start the listen server and database connection
db.open(function(){
var server = DNode(function (client) {

  //Returns server stats, like load, etc. (not much here for now)
  ping : function(callback) {
    callback({ "load" : 1.0 });
  },

  //Shutdown all instances, and die
  shutdownEverything : function() {
    for(var id in instances) {
      instances[id].stop();
    }
    server.close();
  },

  //Starts an instance
  startInstance : function(region_id, callback) {
    createInstance(region_id, db, function(err, instance) {
    
      if(err) {
        callback(err);
        return;
      }
      
      instances[region_id] = instance;
      ++num_instances;
      callback(null);
    });
  },
  
  //Stops an instances
  stopInstance : function(region_id) {
    if(region_id in instances) {
      instances[region_id].stop();
      delete instances[region_id];
    }
  },

  //Called when a player connects
  playerConnect : function(player_id, region_id, client) {
  
    var 
  
  },
  
  //Called when a player leaves
  playerLeave : function(player_id, region_id) {
  },
  
  //Player input
  playerInput : function(player_id, region_id, mesg) {
  }
  
});
server.listen(listen_portnum);
});

console.log("Instance server started!");
