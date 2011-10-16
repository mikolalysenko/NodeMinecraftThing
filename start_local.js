var path = require('path');

//Default settings
var settings = {

  //Web configuration
  web_domain  : 'localhost',
  web_port    : 8000,
  web_url     : 'http://localhost:8000',
  
  //Session token name
  session_token  : '$SESSION_TOKEN',
  
  //Database configuration
  db_name     : 'test',
  db_server   : 'localhost',
  db_port     : 27017,
  
  //Game config options
  game_dir    : path.join(__dirname, 'game'),
  
  //If this flag is set, then reset the entire game state (useful for testing)
  RESET       : false,
  
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

//Start the server
require('./server/main.js').bootStrap(settings);
