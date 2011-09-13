var path = require('path'),
    util = require('util');

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
util.log("Starting server...");
var express = require('express');
var server = express.createServer();
server.use(express.static(settings.wwwroot));


rules.init(function(err) {
  if(err) {
    util.log("Error creating rules: " + err);
    return;
  }

  //Connect to database
  require("./database.js").initializeDB(settings.db_name, settings.db_server, settings.db_port, function(db) {

    function startGame(err) {
      if(err) {
        util.log("Error initializing world: " + err);
        db.close();
        return;
      }

      //Start the gateway server
      require("./gateway.js").createGateway(server, db, rules, function(err, gateway) {
        if(err) {
          util.log("Error creating gateway: " + err);
          db.close();
          return;
        }
        
        //Start http server
        server.listen(settings.web_port);

        //Off to the races!
        util.log("Server initialized!"); 
      });
    };
    
    //Check if we need to initialize the world
    if(settings.RESET) {
      rules.initializeWorld(db, startGame);
    } else {
      startGame(null);
    }
  });
});
