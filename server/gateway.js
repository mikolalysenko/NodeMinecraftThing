var DNode = require('dnode'),
    Instance = require('./instance.js').Instance;

//--------------------------------------------------------------
// A client connection record
//--------------------------------------------------------------
function ClientConnection(session_id, rpc, conn) {
  this.session_id = session_id;
  this.rpc        = rpc;
  this.connection = conn;
  this.player_id  = null;
  this.state      = "prelogin";
}

//--------------------------------------------------------------
// The RPC interface which is exposed to the client
//--------------------------------------------------------------

//Session id counter (this is not exposed, just used internally)
var next_session_id = 0;

function ClientInterface(gateway) {
  return DNode(function(rpc_interface, connection) {

    //Add self to the client list on the server    
    var client = new ClientConnection(next_session_id++, rpc_interface, connection);
    gateway.clientConnect(client);

    //Bind any connection events
    connection.on('end', function() {
      gateway.clientDisconnect(client);
    });
    
    //Define the RPC interface
    this.joinGame = function(player_name, player_password, cb) {      
      gateway.joinGame(
        client,
        player_name,
        player_password,
        function (err) {
          if(err) {
            client.state = "prelogin";
          }
          cb(err);
        });
    };
    
    this.leaveGame = function(cb) {
      gateway.leaveGame(client, cb);
    };
  });
}


//--------------------------------------------------------------
// The gateway object
//--------------------------------------------------------------
function Gateway(db, rules) {
  this.instances         = {};
  this.clients           = {};
  this.db                = db;
  this.rules             = rules;
  this.rules.register(this);
  
  //List of regions in the game
  this.regions           = {};
  
  //Create server last
  this.server     = ClientInterface(this);
}

Gateway.prototype.listen = function(port) {
  this.server.listen(port);
}

Gateway.prototype.lookupRegion = function(region_name) {
  var region_id = this.regions[region_name];
  if(region_id) {
    return region_id;
  }
  return null;
}


//--------------------------------------------------------------
// Connection events
//--------------------------------------------------------------
Gateway.prototype.clientConnect = function(client) {
  console.log("Client connected: " + client.session_id);

  this.clients[client.session_id] = client;
}

Gateway.prototype.clientDisconnect = function(client) {
  console.log("Client disconnected: " + client.session_id);
  
  client.state = "disconnect";
  if(client.session_id in this.clients) {
    delete this.clients[client.session_id];
  }
}

//--------------------------------------------------------------
// Login events
//--------------------------------------------------------------

Gateway.prototype.joinGame = function(client, player_name, password, cb) {
  if(client.state != "prelogin") {
    console.log("Got spam join event, discarding.  Session id = " + client.session_id + ", name = " + player_name);
    cb("Processing...");
    return;
  }

  //Validate player name
  if(player_name.length < 3 || player_name.length > 36 ||
     !(player_name.match(/^[0-9a-zA-Z]+$/))) {
     cb("Invalid player name");
     return;
  }
  
  //Validate password (lame, I know)
  if(password.length < 1 || password.length > 128) {
    cb("Invalid password");
    return;
  }

  console.log("Player joining: " + player_name);

  //Set state
  client.state = "login";

  //Handles the actual join event
  var handleJoin = function(player_rec) {
  
    //Set player state
    client.state = "game";
  
    //Lookup instance
    var region_id = player_rec['region_id'];
    if(!region_id) {
      cb("Missing player region id");
      return;
    }
    var instance = gateway.instances[region_id];
    if(!instance) {
      cb("Player region does not exist!");
      return;
    }
    
    //Activate the player
    instance.activatePlayer(player_rec, function(err) {
      if(err) {
        client.state = "prelogin";
      }
      cb(err);
    });
  };
  
  var handleError = function(err_mesg) {
    client.state = "prelogin";
    
    console.log("Error: " + err_mesg);
    
    cb(err_mesg);
  };
  
  var gateway = this;
  this.db.players.findOne({ 'name': player_name }, function(err, doc) {
    if(doc) {
      if(doc.password == password) {
        handleJoin(doc);
      }
      else {
        handleError("Invalid password");
      }
    }
    else {
      //Assume player not found, then create record
      console.log("Creating player: " + player_name);
      gateway.db.players.save({ 'name':player_name, 'password':password }, function(err, doc) {
        if(err) {
          handleError("Error creating account");
          return;
        }
        else if(doc) {
          
          console.log('doc = ' + JSON.stringify(doc));
          
          
          //Create player entity
          gateway.rules.createPlayerEntity(player_name, function(err, player_entity) {
          
            console.log("here2");
            
            if(err) {
              handleError("Error creating player entity: " + JSON.stringify(err));
              return;
            }
            
            //Link entity id back to player object
            doc.entity_id = player_entity._id;
            
            console.log("Doing upsert with: " + JSON.stringify(doc));
            
            gateway.db.players.save(doc, function(err, doc) {
            
              console.log("here");
            
              if(err) {
                handleError("Error setting player entity?! " + JSON.stringify(err));
                return;
              }
              
              console.log('doc = ' + JSON.stringify(doc));
              
              handleJoin(doc);
            });
          });
        }
        else {
          //This should never happen
          handleError("Unspecified error");
        }
      });
    }
  });
}

Gateway.prototype.leaveGame = function(client, cb) {

  //FIXME: Handle player leave event here

}


//--------------------------------------------------------------
// Gateway constructor
//--------------------------------------------------------------
exports.createGateway = function(db, rules, cb) {

  var gateway = new Gateway(db, rules);

  //Start all of the regions
  db.regions.find({ }, function(err, cursor) {
    if(err) {
      console.log("Error loading regions");
      cb(err, null);
      return;
    }
    
    var num_regions = 0, closed = false;
    
    var check_finished = function() {
      if(num_regions == 0 && closed) {
        cb(null, gateway);
      }
    }
    
    
    cursor.each(function(err, region) {  
      if(err) {
        console.log("Error enumerating regions: " + err);
        cb(err, null);
        return;
      }
      else if(region !== null) {
      
        //Register region
        gateway.regions[region.region_name] = region._id;
      
        num_regions++;
        
        //Start instance server
        var instance = new Instance(region, db, gateway, rules);
        instance.start(function(err) {
          num_regions--;
          if(err) {
            console.log("Error starting region instance: " + region + ", reason: " + err);
            check_finished();
          }
          else {
            console.log("Registered instance: " + JSON.stringify(region));
            gateway.instances[region._id] = instance;
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

