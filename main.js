
//Default settings
var settings = {

  web_port    : 8080,
  io_port     : 6060,
  
  db_name     : 'test',
  db_server   : 'localhost',
  db_port     : 27017,
};  


//Parse out arguments
var argv = require('optimist').argv;
for(var i in argv) {
  if(i in settings) {
    settins[i] = argv[i];
  }
}

//Create http server & websocket server
console.log("Starting server...");
var httpServer = require("./statichttp.js").createStaticHttpServer("www");

//Connect to database and start the application
require("./database.js").initializeDB(settings.db_name, settings.db_server, settings.db_port, function(db) {
  require("./gateway.js").createGateway(db, function(err, gateway) {
    if(err) {
      console.log("Error creating gateway: " + err);
      db.close();
      return;
    }
    
    //Bind http server and gateway
    gateway.server.listen(httpServer);
    httpServer.listen(settings.web_port);

    //Off to the races!
    console.log("Server initialized!");  
  });
});

