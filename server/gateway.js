var dnode = require('dnode'),
    util  = require('util')
    AccountManager = require('./accounts.js').AccountManager;
    
//--------------------------------------------------------------
// A client connection record
//--------------------------------------------------------------
function Client(account, rpc, connection) {
  this.account    = account;
  this.rpc        = rpc;
  this.connection = connection;
}

//--------------------------------------------------------------
// The RPC interface which is exposed to the client
//--------------------------------------------------------------
function Gateway(db, server, sessions, game_module) {

  //Set members
  this.db           = db;
  this.server       = server;
  this.sessions     = sessions;
  this.game_module  = game_module;
  this.accounts     = new AccountManager(db, game_module);
  
  //Clients and instances
  this.clients      = {};
  this.instances    = {};

  //Validates a client interface
  function validateInterface(rpc, methods) {
    for(var i=0; i<methods.length; ++i) {
      if(!(methods[i] in rpc) || typeof(rpc[methods[i]]) != 'function') {
        return false;
      }
    }
    return true;
  }

  //Sets up client interface for gateway
  var gateway = this;
  this.client_interface = dnode(function(rpc, connection) {

    util.log("Client connected");

    //Don't register client until 
    var client    = null,
        user_id   = null;
    
    //Bind any connection events
    connection.on('end', function() {
    
      util.log("Client disconnected");
      if(!client) {
        return;
      }
      
      //TODO: Notify exit event
      
      delete gateway.clients[user_id];
      client = null;
    });
    
    //Reject bad RPC interface
    if(!validateInterface(rpc, [])) {
        connection.end();
        return;
    }
    
    //Player login event
    this.login = function(session_id, cb) {
      if(!session_id || !cb ||
          typeof(session_id) != "string" ||
          typeof(cb) != "function" ) {
        connection.end();
        return;
      }    
      user_id = sessions.getToken(session_id);
      if(!user_id) {
        cb("Invalid session token", null);
        connection.end();
        return;
      }
      
      //Retrieve account
      gateway.accounts.getAccount(user_id, function(err, account) {
        if(err || !account) {
          cb(err, null);
          connection.end();
          return;
        }
        
        //Otherwise register client
        client = new Client(account, rpc, connection);
        gateway.clients[user_id] = client;
        cb(null, account);
      });
    };
    
    //Creates a player
    this.createPlayer = function(player_name, options, cb) {
      if(!player_name || !options || !cb || !client ||
        typeof(player_name) != "string" ||
        typeof(options) != "object" ||
        typeof(cb) != "function" ) {
        return;
      }
      
      gateway.accounts.createPlayer(user_id, player_name, options, function(err, player_rec) {
        if(err || !player_rec) {
          cb(err, null);
          return;
        }
        
        cb(null, player_rec);
      });
    };
    
    //Joins the game
    this.join = function(player_name, cb) {
      if(!player_name || !cb || !client ||
        typeof(player_name) != "string" ||
        typeof(cb) != "function") {
        return;
      }
      
      gateway.accounts.getPlayer(user_id, player_name, function(err, player_rec) {
        if(err || !player_rec) {
          cb(err, null);
          return;
        }
        
        //TODO: Add player to game
        cb(null, player_rec);
      });
    };
    
  });
  
  //Listen for connections on server
  this.client_interface.listen(server);
  
  util.log("Gateway listening");
}

//Adds an instance to the gateway
Gateway.prototype.addInstance = function(region) {
}


//--------------------------------------------------------------
// Gateway constructor
//--------------------------------------------------------------
exports.createGateway = function(db, server, sessions, game_module, cb) {

  var gateway = new Gateway(db, server, sessions, game_module);

  cb(null, gateway);
}

