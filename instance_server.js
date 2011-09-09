var DNode           = require("dnode"),
    initializeDB    = require("./db_start.js").initializeDB,
    createInstance  = require("./instance.js").createInstance;

//Parse out arguments
var listen_port  = (process.argv[2] ? process.argv[2] : 6060),
    db_name      = (process.argv[3] ? process.argv[3] : "test"),
    db_server    = (process.argv[4] ? process.argv[4] : "localhost"),
    db_port      = (process.argv[5] ? process.argv[5] : 27017);

//A player record
function Player(player_id, region_id, client) {
  this.player_id  = player_id;
  this.region_id  = region_id;
}

//Starts server
function startServer(db) {

  //Instances, players and the login gateway
  var instances         = {},
      players           = {},
      gateway           = null;

  //Create server object
  var server = DNode(function (gateway_, conn) {
    
    if(gateway !== null) {
      console.log("WARNING!  A second gateway attempted to connect!");
      return;
    }
    console.log("A gateway server connected!");
    
    //Set a trap for when/if server dies
    conn.on('close', function(){
      console.log("Lost connection to gateway");
      gateway = null;
      this.shutdownEverything();
    });
    
    //Add reference to the gateway
    gateway = gateway_;
    
    //Returns server stats, like load, etc. (not much here for now)
    this.ping = function(callback) {
    
      var regions = [], clients = [];
      for(var i in instances) {
        regions.push(i);
        
        var pl = instances[i].players;
        for(var j in pl) {
          clients.push(j);
        }
      }
    
      callback({
        "load"    : 1.0,
        "regions" : regions,
        "players" : players
      });
    };

    //Shutdown all instances, and die
    this.shutdownEverything = function() {
      console.log("Killing instance server");
      for(var id in instances) {
        instances[id].stop();
      }
      server.close();
    };

    //Starts an instance
    this.startInstance = function(region_id) {
      console.log("Starting instance for region: " + region_id);
      createInstance(region_id, db, function(err, instance) {
      
      
        if(err) {
          console.log(err);
          return;
        }
        
        instances[region_id] = instance;
        ++num_instances;
      });
    };
    
    //Stops an instances
    this.stopInstance = function(region_id) {
      console.log("Stopping instance: " + region_id);
      if(region_id in instances) {
        instances[region_id].stop();
        
        //TODO: Kick all players
        
        delete instances[region_id];
      }
    };

    //Called when a player connects
    this.playerConnect = function(player_id) {
      
      console.log("Player connected: " + player_id);
      
      db.players.findOne({_id: player_id}, function(err, player_rec) {
        if(err) {
          console.log("Error on player connect: " + err + ", player_id = " + player_id);
          return;
        }
        
        var instance = instances[player_rec.region_id];
        if(!instance) {
          console.log("Instance " + player_rec.region_id + " is not running!");
          return;
        }
        
        var player = new Player(player_id, player_rec.region_id);
        players[player_id] = player;
        
        instance.addPlayer(player_rec);
      });
    };
    
    //Called when a player leaves
    this.playerDisconnect = function(player_id) {
    
      console.log("Player " + player_id + " disconnected");
    
      var player = players[player_id];
      if(!player) {
        console.log("Player " + player_id + " does not exists!?!");
        return;
      }
      
      instances[player.region_id].playerDisconnect(player.player_id);
      delete players[player_id];
    };
    
    //Player input
    this.playerInput = function(player_id, mesg) {
      if(region_id in instances) {
        instances[region_id].playerInput(player_id, mesg);
      }
    };
    
  });
  
  //Begin listening
  server.listen(listen_port);
  
  console.log("Instance server started!");
}


//Start the listen server and database connection
initializeDB(db_name, db_server, db_port, startServer);
