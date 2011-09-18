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

//Connect to database
util.log("Starting server...");
require("./database.js").initializeDB(settings.db_name, settings.db_server, settings.db_port, function(db) {

  //Create web server
  var express = require('express');
  var server = express.createServer();
  server.use(express.static(settings.wwwroot));

  //Create game rules
  var rules = new (require('./rules.js').Rules)(settings.game_dir, db);
  rules.setVirtualMountPoints(server, function(err) {
    if(err) {
      util.log("Error mounting client files: " + err);
      return;
    }

    //Call back for starting the gateway server
    function startGame(err) {
      if(err) {
        util.log("Error initializing world: " + err);
        db.close();
        return;
      }
      require("./gateway.js").createGateway(server, db, rules, function(err, gateway) {
        if(err) {
          util.log("Error creating gateway: " + err);
          db.close();
          return;
        }
        server.listen(settings.web_port);
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

