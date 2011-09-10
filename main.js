//Parse out arguments
var argv = require('optimist').argv;

function check_arg(arg, def) {
  if(arg) {
    return arg;
  }
  return def;
}
var web_port   = check_arg(argv.web_port, 8080),
    rpc_port   = check_arg(argv.rpc_port, 6060),
    db_name    = check_arg(argv.db_name, 'test'),
    db_server  = check_arg(argv.db_server, 'localhost'),
    db_port    = check_arg(argv.db_port, 27017);


//Parse out local http scripts
var shared_scripts = require('./shared_scripts.js').shared_scripts,
    server_aliases = { };
for(var script in shared_scripts) {
  server_aliases[script] = require(script).source();
}

//Create http server
var httpServer = require("./server.js").createStaticHttpServer("www", server_aliases);

console.log("Starting server...");                

//Start the application
require("./database.js").initializeDB(db_name, db_server, db_port, function(db) {
  require("./gateway.js").createGateway(db, function(err, gateway) {
    if(err) {
      console.log("Error creating gateway: " + err);
      db.close();
      return;
    }
    
    //Bind http server and gateway
    httpServer.listen(web_port);
    gateway.server.listen(rpc_port).listen(httpServer);

    //Off to the races!
    console.log("Server initialized!");  
  });
});

