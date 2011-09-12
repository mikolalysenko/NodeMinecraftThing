var path = require('path');

//Default settings
var settings = {

  //Web configuration
  web_port    : 8080,
  wwwroot     : path.join(__dirname, "../www"),
  
  //Database configuration
  db_name     : 'test',
  db_server   : 'localhost',
  db_port     : 27017,
  
  //Game config options
  game_dir    : path.join(__dirname, '../game'),
  
  //If this flag is set, then reset the entire game state (useful for testing)
  RESET       : true,
  
};


//Parse out arguments from commandline
var argv = require('optimist').argv;
for(var i in argv) {
  if(i in settings) {
    settins[i] = argv[i];
  }
}

//Create game rules
var rules = new (require('./rules.js').Rules)(settings.game_dir);

//Create http server & websocket server
console.log("Starting server...");
var express = require('express');
var server = express.createServer();
server.use(express.static(settings.wwwroot));

//Connect to database
require("./database.js").initializeDB(settings.db_name, settings.db_server, settings.db_port, function(db) {

  var cc = function(err) {
    if(err) {
      console.log("Error initializing world");
      db.close();
      return;
    }

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
  };
  
  //Check if we need to initialize the world
  if(settings.RESET) {
    rules.initializeWorld(db, cc);
  } else {
    cc(null);
  }
  
});

