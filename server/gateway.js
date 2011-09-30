var util  = require('util')
    AccountManager = require('./accounts.js').AccountManager,
    RegionSet = require('./regions.js').RegionSet;

function sink(err) { if(err) util.log(err); }
    
//--------------------------------------------------------------
// A client connection record
//--------------------------------------------------------------
function Client(account, socket) {
  this.state        = 'login';
  this.account      = account;
  this.socket       = socket;
  this.player_id    = null;
  this.instance     = null;
  this.callback_id  = -1;
  this.callbacks    = {};
}

Client.prototype.makeCallback = function(cb) {
  this.callbacks[++callback_id] = cb;
  return callback_id;
}

Client.prototype.kick = function() {
  this.connection.disconnect();
}

Client.prototype.changeInstance = function(region_info) {
  this.socket.emit('changeInstance', region_info);
}

Client.prototype.updateInstance = function(tick_count, updates, removals, voxels) {
  this.socket.emit('updateInstance', tick_count, updates, removals, voxels);
}

Client.prototype.updateChunks = function(updates, cb) {
  this.socket.emit('updateChunks', updates, this.makeCallback(cb));
}

Client.prototype.remoteMessage = function(tick_count, action_name, entity_id, actions) {
  this.socket.emit('remoteMessage', tick_count, action_name, entity_id, actions);
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
  var gateway = this,
      io = require('socket.io').listen(server);
      
  //Player login event
  io.sockets.on('connection', function(socket) {
  
    util.log("Client connected");

    //Don't register client until logc
    var client            = null,
        account_id        = null,
        throttle_counter  = game_module.client_throttle,
        throttle_interval = null;
        
    //Converts callback into callback num
    function callback(cb_num) {
      return function() {
        socket.emit.apply(socket, ['callback', cb_num].concat(Array.prototype.slice.call(arguments, 1)));
      }
    }
    
    socket.on('callback', function(cb_num) {
      if(!client) {
        return;
      }
      var cb = client.callbacks[cb_num];
      if(!cb) {
        return;
      }
      
      //Unregister callback, and execute it
      delete client.callbacks[cb_num];      
      cb.call(Array.slice.call(arguments,1));
    });
    
    //Bind any connection events
    socket.on('disconnect', function() {
    
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
    
    
    //Player login event
    socket.on('login', function(session_id, cb_num) {
      if( client ||
          typeof(session_id) != "string" ||
          typeof(cb_num) != "number" ) {
        client.kick();
        return;
      }
      var cb = callback(cb_num);
      
      user_id = sessions.getToken(session_id);
      if(!user_id) {
        cb("Invalid session token");
        client.kick();
        return;
      }
      
      //Retrieve account
      gateway.accounts.getAccount(user_id, function(err, account) {
        if(err || !account) {
          cb(JSON.stringify(err));
          client.kick();
          return;
        }
        
        util.log("Account connected: " + JSON.stringify(account));
        
        //Otherwise register client
        client = new Client(account, socket);
        gateway.clients[account_id] = client;
        account_id = account._id;
        
        //Set up throttle counter
        setInterval(function() {
          throttle_counter = gateway.game_module.client_throttle;
        }, 1000);
        
        //Retrieve players, send to client
        gateway.accounts.listAllPlayers(account_id, function(err, players) {
          if(err) {
            cb(JSON.stringify(err));
            client.kick();
            return;
          }
          cb(null, account, players);
        });
      });
    });
    
    //Creates a player
    socket.on('createPlayer', function(options, cb_num) {
      if(--throttle_counter < 0 ||
        !client || client.state != 'login' ||
        typeof(options) != "object" ||
        typeof(cb_num) != "number" ) {
        client.kick();
        return;
      }
      var cb = callback(cb_num);
      
      util.log("Creating player: " + JSON.stringify(options));
      
      gateway.accounts.createPlayer(client.account, options, function(err, player_rec) {
        if(err || !player_rec) {
          util.log(err);
          cb("Can not create player -- " + err, null);
          return;
        }
        cb(null, player_rec);
      });
    });
    
    socket.on('deletePlayer', function(player_name, cb_num) {
      if(--throttle_counter < 0 ||
        !client || client.state != 'login' ||
        typeof(player_name) != "string" ||
        typeof(cb_num) != "number") {
        client.kick();
        return;
      }
      
      gateway.accounts.deletePlayer(account_id, player_name, callback(cb_num));
    });
    
    //Joins the game
    socket.on('joinGame', function(player_name, cb_num) {
      if(--throttle_counter < 0 ||
        !client || client.state != 'login' ||
        typeof(player_name) != "string" ||
        typeof(cb_num) != "number") {
        client.kick();
        return;
      }
      var cb = callback(cb_num);
      
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
    });
    
    //Player action
    socket.on('remoteMessage', function(action_name, entity_id, args) {
    
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
    });
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

