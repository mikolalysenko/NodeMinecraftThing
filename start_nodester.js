var path = require('path');

//Default settings
var settings = {

  //Web configuration
  web_domain  : 'mmotest.nodester.com',
  web_port    : 12070,
  web_url     : 'http://mmotest.nodester.com',
  
  //Session token name
  session_token  : '$SESSION_TOKEN',
  
  //Database configuration
  db_name     : 'mmotest',
  db_server   : 'dbh55.mongolab.com',
  db_port     : 27557,
  db_user     : 'mmotest',
  db_passwd   : 'JXSemIFGv3',
  
  //Game config options
  game_dir    : path.join(__dirname, 'game'),
  
  //If this flag is set, then reset the entire game state (useful for testing)
  RESET       : false,
  
  //If this flag is set, don't compress the client
  debug       : false,
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
