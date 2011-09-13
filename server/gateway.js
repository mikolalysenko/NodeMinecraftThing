var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    mount = require('./mount.js').mount,
    ObjectID = require('mongodb').ObjectID,
    DNode = require('dnode'),
    Instance = require('./instance.js').Instance;

//--------------------------------------------------------------
// A client connection record
//--------------------------------------------------------------
function ClientConnection(session_id, rpc, conn) {
  this.session_id = session_id;
  this.rpc        = rpc;
  this.connection = conn;
  this.player_id  = null;
  this.instance   = null;
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
    this.joinGame = function(player_name, player_password, options, cb) {
    
      if(client.state != "prelogin") {
        util.log("Got spam join event, discarding.  Session id = " + client.session_id + ", name = " + player_name);
        cb("Processing...");
        return;
      }
    
      client.state = "login";
    
      gateway.joinGame(
        client,
        player_name,
        player_password,
        options,
        function (err) {
          if(err) {
            client.state = "prelogin";
            cb(err);
          }
          else {
            client.state = "game";
            cb("");
          }
        });
    };
    
    this.chat = function(mesg) {
      gateway.chat(client, mesg);
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
  this.rules.registerGateway(this);
  
  //List of regions in the game
  this.regions           = {};
  
  //Create server last
  this.server     = ClientInterface(this);
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
  util.log("Client connected: " + client.session_id);

  this.clients[client.session_id] = client;
}

Gateway.prototype.clientDisconnect = function(client) {
  util.log("Client disconnected: " + client.session_id);
  
  var pstate = client.state;

  client.state = "disconnect";
  if(client.session_id in this.clients) {
    delete this.clients[client.session_id];
  }
    
  if(pstate == "game") {
    client.instance.deactivatePlayer(client.player_id, function() { });
  }
}

//--------------------------------------------------------------
// Player login
//--------------------------------------------------------------

Gateway.prototype.joinGame = function(client, player_name, password, options, cb) {
 
  //Validate
  if(player_name.length < 3 || player_name.length > 36 ||
     !(player_name.match(/^[0-9a-zA-Z]+$/))) {
     cb("Invalid player name");
     return;
  }
  if(password.length < 1 || password.length > 128) {
    cb("Invalid password");
    return;
  }
  
  util.log("Player joining: " + player_name);
  var gateway = this;

  //Handles the actual join event
  var handleJoin = function(player_rec, entity_rec) {

    if(client.state == "disconnect") {
      util.log('Client disconnected while logging in');
      return;
    }

    //Look up instance
    var region_id = entity_rec['region_id'];
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
    instance.activatePlayer(client, player_rec, entity_rec, function(err) {
      if(err) {
        cb(err);
        return;
      }
      cb(null);
    });
  };
  
  var handleError = function(err_mesg) {
    util.log("Error: " + err_mesg);
    cb(err_mesg);
  };
  
  this.db.players.findOne({ 'name': player_name }, function(err, player_rec) {
    if(player_rec) {
      if(player_rec.password == password) {
        gateway.db.entities.findOne({ '_id': doc.entity_id }, function(err, entity_rec) {
          if(err) {
            handleError("Error locating player entity: " + JSON.stringify(err));
            return;
          }
          
          handleJoin(player_rec, entity_rec);
        });
      }
      else {
        handleError("Invalid password");
      }
    }
    else {
      //Assume player not found, then create record
      util.log("Creating new player: " + player_name);
      
      gateway.rules.createPlayer(player_name, password, options, function(err, player_rec, entity_rec) {
        if(err) {
          handleError("Error creating player entity: " + JSON.stringify(err));
          return;
        }
        handleJoin(player_rec, entity_rec);
      });
    }
  });
}


//--------------------------------------------------------------
// Gateway constructor
//--------------------------------------------------------------
exports.createGateway = function(server, db, rules, cb) {

  var gateway = new Gateway(db, rules);
  gateway.server.listen(server);
  
  //Create list of files to mount
  var patcher_path = path.join(__dirname, '/patcher.js');

  //Mount files  
  mount(server, {
    '/patcher.js' : { 
      src: fs.readFileSync(patcher_path), 
      modified: fs.statSync(patcher_path).mtime,
    },
    '/components.js' : {
      src: rules.client_file,
      modified: rules.client_mtime,
    },
  });

  //Start all of the regions
  db.regions.find({ }, function(err, cursor) {
    if(err) {
      util.log("Error loading regions: " + err);
      cb(err, null);
      return;
    }
    
    var num_regions = 0, closed = false;
    
    function check_finished() {
      if(num_regions == 0 && closed) {
        cb(null, gateway);
      }
    }
    
    cursor.each(function(err, region) {  
      if(err) {
        util.log("Error enumerating regions: " + err);
        cb(err, null);
        return;
      }
      else if(region !== null) {
      
        //Register region
        gateway.regions[region.region_name] = region._id;
      
        num_regions++;
        
        
        util.log("Starting region: " + JSON.stringify(region));
        
        //Start instance server
        var instance = new Instance(region, db, gateway, rules);
        instance.start(function(err) {
          num_regions--;
          if(err) {
            util.log("Error starting region instance: " + region + ", reason: " + err);
            check_finished();
          }
          else {
            util.log("Registered instance: " + JSON.stringify(region));
            gateway.instances[region._id] = instance;
            check_finished();
          }
        });
      }
      else {
        closed = true;
        check_finished();
      }
    });
  });
}

