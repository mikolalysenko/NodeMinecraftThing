var path = require('path');

//Default settings
var settings = {

  web_port    : 8080,
  wwwroot     : path.join(__dirname, "../www"),
  
  db_name     : 'test',
  db_server   : 'localhost',
  db_port     : 27017,  
};


//Parse out arguments from commandline
var argv = require('optimist').argv;
for(var i in argv) {
  if(i in settings) {
    settins[i] = argv[i];
  }
}

//Create the rules object
var rules = new (require('./rules.js').Rules)();

//Create http server & websocket server
console.log("Starting server...");
var express = require('express');
var server = express.createServer();
server.use(express.static(settings.wwwroot));

//Connect to database
require("./database.js").initializeDB(settings.db_name, settings.db_server, settings.db_port, function(db) {

  //Start the gateway server
  require("./gateway.js").createGateway(db, rules, function(err, gateway) {
    if(err) {
      console.log("Error creating gateway: " + err);
      db.close();
      return;
    }
    
    //Bind http server and gateway
    gateway.listen(server);
    server.listen(settings.web_port);

    //Off to the races!
    console.log("Server initialized!");  
  });
});

