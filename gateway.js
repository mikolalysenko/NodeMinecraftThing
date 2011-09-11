var DNode = require('dnode'),
    createInstance = require("./instance.js").createInstance;

//A client connection data structure
function ClientConnection(session_id, rpc, conn) {
  this.session_id    = session_id;
  this.rpc_interface = rpc;
  this.connection    = conn;
  this.state         = "login";
}

//The client interface
function ClientInterface(gateway) {
  return DNode(function(rpc_interface, connection) {

    //Add self to the client list on the server    
    var client = new ClientConnection(gateway.next_session_id++, rpc_interface, connection);
    gateway.clients[client.session_id] = client;
    
    console.log("Got client connection: " + client.session_id);
    
    //Now define the client interface
    this.createCharacter = function(player_name, player_password) {
      if(client.state !== "login") {
        return "Already logged in";
      }
    
    };
    
    //Player connection event
    this.connect = function(player_name, player_password) {
      if(client.state !== "login") {
        return "Already logged in";
      }
      
    };
    
    //Player disconnect event
    this.disconnect = function() {
    };
  });
}

//The gateway object
function Gateway(db) {
  this.instances         = {};
  this.clients           = {};
  this.db                = db;
  this.next_session_id   = 0;
  
  //Create server last
  this.server     = ClientInterface(this);
}

//Shutsdown the gateway
Gateway.prototype.shutdown = function(cb) {
}

//Begins listening
Gateway.prototype.listen = function(port) {
  this.server.listen(port);
}

//Kicks a player from the game
Gateway.prototype.kickPlayer = function(player_id) {
}

//Sends a message to all players in a region
Gateway.prototype.regionMessage = function(region_id, mesg) {
}

//Sends a message to all players in the game
Gateway.prototype.globalMessage = function(mesg) {
}

//Migrates a player to a new region
Gateway.prototype.migratePlayer = function(player_id, new_region_id) {
}


//Creates a gateway server
exports.createGateway = function(db, cb) {

  var gateway = new Gateway(db);

  //Start all of the regions
  db.regions.find({ }, function(err, cursor) {
    if(err) {
      console.log("Error loading regions");
      cb(err, null);
      return;
    }
    
    var num_regions = 0, closed = false;
    
    cursor.each(function(err, region) {  
      if(err) {
        console.log("Error enumerating regions: " + err);
        cb(err, null);
        return;
      }
      else if(region !== null) {
        num_regions++;
        var instance = new Instance(region, db, gateway);
        instance.start(function(err) {
          num_regions--;
          if(err) {
            console.log("Error starting region instance: " + region + ", reason: " + err);
            check_finished();
          }
          else {
            console.log("Registered instance: " + region);
            instances[region._id] = instance;
            check_finished();
          }
        });
      }
      else {
        closed = true;
      }
      
      if(num_regions == 0 && closed) {
        cb(null, gateway);
        return;
      }
    });
  });
}

