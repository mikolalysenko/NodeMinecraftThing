var dnode = require('dnode'),
    util  = require('util')
    AccountManager = require('./accounts.js').AccountManager,
    RegionSet = require('./regions.js').RegionSet;

function sink(err) { if(err) util.log(err); }
    
//--------------------------------------------------------------
// A client connection record
//--------------------------------------------------------------
function Client(account, rpc, connection) {
  this.state      = 'login';
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
  this.region_set   = new RegionSet(db, game_module);
  this.accounts     = new AccountManager(db, game_module, this.region_set);
  
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
    var client      = null,
        account_id  = null;
    
    //Bind any connection events
    connection.on('end', function() {
    
      util.log("Client disconnected");
      if(!client) {
        return;
      }
      
      //Log out of account
      gateway.accounts.closeAccount(account_id, sink);
      
      //TODO: Handle exit event here
      if(client.state == 'game') {
        gateway.region_set.removeClient(client, sink);
      }
      
      delete gateway.clients[account_id];
      client = null;
    });
    
    //Reject bad RPC interface
    if(!validateInterface(rpc, [])) {
        connection.end();
        return;
    }
    
    //Player login event
    this.login = function(session_id, cb) {
      if( client ||
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
        
        util.log("Account connected: " + JSON.stringify(account));

        
        //Otherwise register client
        client = new Client(account, rpc, connection);
        gateway.clients[account_id] = client;
        account_id = account._id;
        
        
        //Retrieve players, send to client
        gateway.accounts.listAllPlayers(account_id, function(err, players) {
          if(err) {
            cb(err, null, null);
            connection.end();
            return;
          }
          cb(null, account, players);
        });
      });
    };
    
    //Creates a player
    this.createPlayer = function(options, cb) {
      if(!client || client.state != 'login' ||
        typeof(options) != "object" ||
        typeof(cb) != "function" ) {
        connection.end();
        return;
      }
      
      util.log("Creating player: " + JSON.stringify(options));
      
      gateway.accounts.createPlayer(client.account, options, function(err, player_rec) {
        if(err || !player_rec) {
          util.log(err);
          cb("Can not create player -- " + err, null);
          return;
        }
        cb(null, player_rec);
      });
    };
    
    this.deletePlayer = function(player_name, cb) {
      if(!client || client.state != 'login' ||
        typeof(player_name) != "string" ||
        typeof(cb) != "function") {
        connection.end();
        return;
      }
      
      gateway.accounts.deletePlayer(account_id, player_name, cb);
    };
    
    //Joins the game
    this.joinGame = function(player_name, cb) {
      if(!client || client.state != 'login' ||
        typeof(player_name) != "string" ||
        typeof(cb) != "function") {
        connection.end();
        return;
      }
      
      gateway.accounts.getPlayer(account_id, player_name, function(err, player_rec) {
        if(err || !player_rec) {
          cb(err, null);
          return;
        }
        
        gateway.region_set.addClient(player_rec, client, function(err) {
          if(err) {
            cb(err, null);
            return;
          }
        
          //Set client state to game
          client.state = 'game';
          cb(null, player_rec);
        });
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
  gateway.region_set.init(function(err) {
    if(err) {
      cb(err, null);
      return;
    }
    cb(null, gateway);
  });
}

