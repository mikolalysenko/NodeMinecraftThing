var path              = require("path"),
    child_process     = require("child_process"),
    DNode             = require("dnode");

//Parse out arguments
var web_port  = (process.argv[2] ? process.argv[2] : 8080),
    db_name   = (process.argv[3] ? process.argv[3] : "test"),
    db_server = (process.argv[4] ? process.argv[4] : "localhost"),
    db_port   = (process.argv[5] ? process.argv[5] : 27017),;
    
var worker_ports = process.argv.slice(6);
if(worker_ports.length == 0) {
  worker_ports = [ 6060 ];
}

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
  var instance_connections  = new Array(worker_ports.length),
      regions               = {},
      players               = {};

  //DNode connection to instance server
  var GatewayInterface = {
    
    send : function(player_id, mesg) {
    },
    
    
    broadcast : function(region_id, mesg) {
    }
    
  };

  //Connects to each of the instances
  function connectToInstances(next) {
    var pending = worker_ports.length;

    function connectToInstance(num) {
      DNode(InstanceCallbacks).connect(worker_port[num], 
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
  
}

//Start gateway server and database
initializeDb(db_name, db_server, db_port, startGateway);

