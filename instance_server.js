var mongodb   = require("mongodb"),
    DNode     = require("dnode"),
    createInstance = require("./instance.js").createInstance,
    EventEmitter = require("events").EventEmitter;


//Parse out arguments
var listen_portnum  = process.argv[2],
    db_name         = process.argv[3],
    db_server       = process.argv[4],
    db_port         = process.argv[5];


//A player record
function Player(player_id, region_id, client) {
  this.player_id  = player_id;
  this.region_id  = region_id;
  this.client     = client;
}

//Database connection and instances
var db = new mongodb.Db(db_name, new mongodb.Server(db_server, db_port, {}), {});
var instances         = {},
    clients           = [],
    players           = {};    


//Communication from instances to clients passes through this emitter
var emitter = new EventEmitter();

emitter.on('send', function(player_id, mesg) {
  var player = players[player_id];
  if(!player) {
    return;
  }
  player.client.sendMessage({'type':'send', 'player_id':player_id, 'mesg':mesg });
});

emitter.on('broadcast', function(region_id, mesg) {
  for(var i=0; i<clients.length; ++i) {
    clients[i].sendMessage({'type':'broadcast', 'region_id':region_id, 'mesg':mesg});
  }
});

//Starts server
function startServer() {

  //Create server object
  var server;
  server = DNode(function (client, conn) {
    
    //Add client
    clients.push(client);
    
    //Returns server stats, like load, etc. (not much here for now)
    this.status = function(callback) {
    
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
      if(region_id in instances) {
        instances[region_id].stop();
        delete instances[region_id];
      }
    };

    //Called when a player connects
    this.playerConnect = function(player_id) {
      
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
        
        var player = new Player(player_id, player_rec.region_id, client);
        players[player_id] = player;
        
        instance.addPlayer(player_rec);
      });
    };
    
    //Called when a player leaves
    this.playerDisconnect = function(player_id) {
      var player = players[player_id];
      
      if(!player) {
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
  server.listen(listen_portnum);
  
  console.log("Instance server started!");
}


//Start the listen server and database connection
function addCollection(col, cb) {
  db.collection(col, function(err, collection) {
    if(err) {
      console.log("Error adding collection '" + col + "': " + err);
      return;
    }
    db[col] = collection;
    cb();
  });
}


//Open database and start server
db.open(function(err, db_){

  if(err) {
    console.log("Error connecting to database");
    return;
  }
  
  db = db_;
  
  addCollection('entities', function() { 
    addCollection('players', function() { 
      addCollection('regions', startServer); 
    });
  });
});
