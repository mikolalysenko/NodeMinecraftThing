var DNode = require('dnode'),
    createInstance = require("./instance.js").createInstance;

//Session id counter (this is not exposed, just used internally)
var next_session_id = 0;

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
        cb);
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
  this.next_session_id   = 0;
  this.rules             = rules;
  
  //Create server last
  this.server     = ClientInterface(this);
}

Gateway.prototype.listen = function(port) {
  this.server.listen(port);
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


  console.log("Player joining: " + player_name);

  //Set state
  client.state = "login";

  //Handles the actual join event
  var handleJoin = function(player_rec) {
  
    //Set player state
    client.state = "game";
  
    //FIXME: Add player to instance here
    
    //Send a null element for an error free login
    cb(null);
  };
  
  var handleError = function(err_mesg) {
    client.state = "prelogin";
    cb(err_mesg);
  };
  
  var gateway = this;
  this.db.players.findOne({ 'name': player_name }, function(err, doc) {
    if(client.state != "login") {
      return;
    }
  
    //FIXME: Check for errors on query here
    
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
        if(client.state != "login") {
          return;
        }
        else if(err) {
          handleError("Error creating account");
          return;
        }
        else if(doc) {
          
          //FIXME: Create initial state for player's entity here
        
          handleJoin(doc);
        }
        else {
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
    
    cursor.each(function(err, region) {  
      if(err) {
        console.log("Error enumerating regions: " + err);
        cb(err, null);
        return;
      }
      else if(region !== null) {
        num_regions++;
        var instance = new Instance(region, db, gateway, rules);
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

