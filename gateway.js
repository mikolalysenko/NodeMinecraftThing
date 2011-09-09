var path              = require("path"),
    child_process     = require("child_process"),
    DNode             = require("dnode"),
    initializeDB      = require("./db_start.js").initializeDB;

//Parse out arguments
var web_port  = (process.argv[2] ? process.argv[2] : 8080),
    db_name   = (process.argv[3] ? process.argv[3] : "test"),
    db_server = (process.argv[4] ? process.argv[4] : "localhost"),
    db_port   = (process.argv[5] ? process.argv[5] : 27017);
    
var worker_ports = process.argv.slice(6);
if(worker_ports.length == 0) {
  worker_ports = [ 6060 ];
}

//Starts the gateway server
function startGateway(db) {

  //The player data type
  function Player(player_rec) {
    this.player_id  = player_rec._id;
    this.region_id  = player_rec.region_id;
  };
  
  //A region datatype
  function Region(region_rec) {
    this.region_id    = region_rec._id;
    this.players      = [];
  };

  //The array of all instance workers
  var instances  = new Array(worker_ports.length),
      regions    = {},
      players    = {};

  //DNode connection to instance server
  var GatewayInterface = {
    
    send : function(player_id, mesg) {
      //TODO: Send a message to all clients
    },
     
    broadcast : function(region_id, mesg) {
      //TODO: Broadcast a message to all clients
    }
  };

  //Connects to each of the instances
  function connectToInstances(next) {
    var pending = worker_ports.length;

    function connectToInstance(num) {
      console.log("Connecting to worker: " + num);
      DNode(GatewayInterface).connect(worker_ports[num], 
        function(remote, conn) {
          instances[num] = remote;
          if(--pending == 0) {
            next();
          }
        });
    }

    for(var i=0; i<worker_ports.length; ++i) {
      connectToInstance(i);
    }  
  }
  
  connectToInstances(function() {
  
    console.log("All done!");
  });
}

//Start gateway server and database
initializeDB(db_name, db_server, db_port, startGateway);

