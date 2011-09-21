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
  
  //If this flag is set, don't compress the client
  debug       : true,
  
};

//Parse out arguments from commandline
var argv = require('optimist').argv;
for(var i in argv) {
  if(i in settings) {
    settings[i] = argv[i];
  }
}


//Connects to database, adds references for collections
function initializeDB(next) {
  var mongodb   = require('mongodb'),
      db_name   = settings.db_name,
      db_server = settings.db_server,
      db_port   = settings.db_port,
      db = new mongodb.Db(db_name, new mongodb.Server(db_server, db_port, {}), {});

  db.open(function(err, db){

    if(err) {
      util.log("Error connecting to database");
      return;
    }
    
    function addCollection(col, cb) {
      db.collection(col, function(err, collection) {
        if(err) {
          util.log("Error adding collection '" + col + "': " + err);
          return;
        }
        db[col] = collection;
        cb();
      });
    }
    
    addCollection('entities', function() {
      addCollection('players', function() { 
        db.players.ensureIndex([['player_name',1]], true, function() {
          addCollection('regions', function() {
            addCollection('chunks', function() {
              db.chunks.ensureIndex([['region_id',1]], false, function() {
                next(db);
              });
            });
          }); 
        });
      });
    });
  });
}

//Create web server
function createServer() {

  var express = require('express'),
      server = express.createServer();

  //Mount client files
  var options = {
    require: [  path.join(__dirname, '../client/engine.js'),
                path.join(settings.game_dir, './client.js'),
                'events' ],
  };
  if(settings.debug) {
    options.watch = true;
  }
  else {
    options.watch = false;
    options.filter = require("uglify-js");
  }
  server.use(require('browserify')(options));

  //Mount extra, non-browserify files
  server.use(express.static(path.join(settings.game_dir, './www/')));
  
  return server;
}

//Starts the game
function startGame(server, db, rules) {
  require("./gateway.js").createGateway(server, db, rules, function(err, gateway) {
    if(err) {
      util.log("Error creating gateway: " + err);
      db.close();
      return;
    }
    server.listen(settings.web_port);
    util.log("Server initialized!"); 
  });
}

//Start the server
function startServer() {

  util.log("Starting server...");
  
  initializeDB(function(db) {
    createServer().listen(settings.web_port);
    
      /*
      var rules   = new (require('./rules.js').Rules)(settings.game_dir, db),
      //Check if we need to initialize the world
      if(settings.RESET) {
        rules.initializeWorld(db, startGame);
      } else {
        startGame(null);
      }  
      server.listen(settings.web_port);    
      */

    
  });
} 


startServer();
