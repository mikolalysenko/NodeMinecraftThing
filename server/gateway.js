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
  this.player_id  = null;
  this.instance   = null;
}

Client.prototype.kick = function() {
  this.connection.disconnect();
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
        account_id  = null,
        throttle_counter = game_module.client_throttle,
        throttle_interval = null;
    
    connection.on('end', function() {
      console.log("CONNECTION ENDED");
    });
    
    connection.on('close', function() {
      console.log("CONNECTION CLOSED");
    });
    
    //Bind any connection events
    connection.on('disconnect', function() {
    
      util.log("Client disconnected");
      if(!client) {
        return;
      }
      
      //Remove from server
      if(client.state == 'game') {
        gateway.region_set.removeClient(client, sink);
      }

      //Log out of account
      gateway.accounts.closeAccount(account_id, sink);
      
      delete gateway.clients[account_id];
      client = null;
      account_id = null;
    });
    
    //Reject bad RPC interface
    if(!validateInterface(rpc, [])) {
        client.kick();
        return;
    }
    
    //Player login event
    this.login = function(session_id, cb) {
      if( client ||
          typeof(session_id) != "string" ||
          typeof(cb) != "function" ) {
        client.kick();
        return;
      }    
      user_id = sessions.getToken(session_id);
      if(!user_id) {
        cb("Invalid session token", null);
        client.kick();
        return;
      }
      
      //Retrieve account
      gateway.accounts.getAccount(user_id, function(err, account) {
        if(err || !account) {
          cb(err, null);
          client.kick();
          return;
        }
        
        util.log("Account connected: " + JSON.stringify(account));

        
        //Otherwise register client
        client = new Client(account, rpc, connection);
        gateway.clients[account_id] = client;
        account_id = account._id;
        
        //Set up throttle counter
        setInterval(function() {
          throttle_counter = gateway.game_module.client_throttle;
        }, 1000);
        
        //Retrieve players, send to client
        gateway.accounts.listAllPlayers(account_id, function(err, players) {
          if(err) {
            cb(err, null, null);
            client.kick();
            return;
          }
          cb(null, account, players);
        });
      });
    };
    
    //Creates a player
    this.createPlayer = function(options, cb) {
    
      if(--throttle_counter < 0 ||
        !client || client.state != 'login' ||
        typeof(options) != "object" ||
        typeof(cb) != "function" ) {
        client.kick();
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
      if(--throttle_counter < 0 ||
        !client || client.state != 'login' ||
        typeof(player_name) != "string" ||
        typeof(cb) != "function") {
        client.kick();
        return;
      }
      
      gateway.accounts.deletePlayer(account_id, player_name, cb);
    };
    
    //Joins the game
    this.joinGame = function(player_name, cb) {
      if(--throttle_counter < 0 ||
        !client || client.state != 'login' ||
        typeof(player_name) != "string" ||
        typeof(cb) != "function") {
        client.kick();
        return;
      }
      
      gateway.accounts.getPlayer(account_id, player_name, function(err, player_rec) {
        if(err || !player_rec) {
          cb(err, null);
          return;
        }
        
        gateway.region_set.addClient(client, player_rec, function(err) {
          if(err) {
            cb(err, null);
            return;
          }
        
          //Set client state to game
          client.state = 'game';
          client.player_id = player_rec._id;
          
          cb(null, player_rec);
        });
      });
    };
    
    //Player action
    this.remoteMessage = function(action_name, entity_id, args) {
    
      if(--throttle_counter < 0 ||
         !client ||
          client.state != 'game' ||
         !client.instance ||
         typeof(action_name) != 'string' ||
         typeof(args) != 'object' ||
         !(args instanceof Array)) {
        return;
      }
    
      client.instance.remoteMessage(action_name, client.player_id, entity_id, args);
    };
    
  });
  
  
  
  //Listen for connections on server
  var tout = this.game_module.socket_timeout;
  this.client_interface.listen(server, {
    io:{
      //'heartbeat timeout': this.game_module.socket_timeout,
      'transports': this.game_module.socket_transports,
      
      /*
      transportOptions: {
        'flashsocket': {
          closeTimeout: tout,
          timeout: tout
        }, 'websocket': {
          closeTimeout: tout,
          timeout: tout
        }, 'htmlfile': {
          closeTimeout: tout,
          timeout: tout
        }, 'xhr-multipart': {
          closeTimeout: tout,
          timeout: tout
        }, 'xhr-polling': {
          closeTimeout: tout,
          timeout: tout
        }, 'jsonp-polling': {
          closeTimeout: tout,
          timeout: tout
        }
      } 
      */
    }
  });
  
  util.log("Gateway listening");
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

