var path = require('path'),
    url  = require('url'),
    fs   = require('fs'),
    util = require('util'),
    querystring = require('querystring');

//Default settings
var settings = {

  //Web configuration
  web_domain  : 'localhost',
  web_port    : 8080,
  
  //Session token name
  session_token  : '$SESSION_TOKEN',
  
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

//Game server module
var game_module = require(path.join(settings.game_dir, '/server.js'));

//Session handler
var sessions = new (require('./session.js').SessionHandler)();


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
    
    addCollection('accounts', function() {
      db.accounts.ensureIndex([['user_id', 1]], true, function() {
        addCollection('entities', function() {
          addCollection('players', function() { 
            db.players.ensureIndex([['user_id', 1]], false, function() {
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
      });
    });
  });
}


//Attaches an open ID provider
function attachOpenID(server, login) {

  var openid = require('openid'),
  
      relying_party = new openid.RelyingParty(
        'http://' + settings.web_domain + ':' + settings.web_port + '/verify',
        null,
        false,
        false,
        []),
      
      providers = game_module.openid_providers;

  //Add handler to server      
  server.use(function(req, res, next) {
  
    console.log("here!");
  
    var parsed_url = url.parse(req.url);
    
    if(parsed_url.pathname === '/authenticate') {
      var query         = querystring.parse(parsed_url.query),
          provider_str  = query.provider;

      if(!provider_str || !(provider_str in providers)) {
        res.writeHead(200);
        res.end('Invalid provider');
        return;
      }
      
      //Authenticate with provider
      var provider = providers[provider_str];
      
      console.log("Logging in with provider: " + provider);
      
      if(provider == "temp") {
      
        console.log("Using temporary login");
      
        //Make a temporary account
        res.writeHead(302, {Location: 'http://' + settings.web_domain + ':' + settings.web_port + '/verify?temp=1'});
      }
      else {
      
        //Otherwise, verify through OpenID
        relying_party.authenticate(provider, false, function(error, auth_url) {
          if(error || !auth_url) {
            res.writeHead(200);
            res.end('Authentication failed');
          }
          else {
          
            res.writeHead(302, {Location: auth_url});
            res.end();
          }
        });
      }
    }
    else if(parsed_url.pathname === '/verify') {

      console.log("Verifying");

      var query         = querystring.parse(parsed_url.query),
          temporary     = query.temp;
          
      if(temporary) {
        
        console.log("Joining with temporary account");
      
        //Create temporary account and add to game
        login(res, "temporary");
      }
      else {
        
        relying_party.verifyAssertion(req, function(error, result) {
        
          console.log("Using persistent account: " + result.claimedIdentifier);
          
          //Log in to database, send response
          login(res, result.claimedIdentifier);
        });
      }
    }
    else {
      console.log("here!34", req.url);
      next();
    }
  });
}


//Create web server
function createServer() {

  var connect     = require('connect'),
      server      = connect.createServer(),
      client_html = fs.readFileSync(game_module.client_html, 'utf-8');
      
  //Parse out client document
  var token_loc     = client_html.indexOf(settings.session_token),
      client_start  = client_html.substr(0, token_loc),
      client_end    = client_html.substr(token_loc + settings.session_token.length);

  //Mount extra, non-browserify files
  server.use(connect.static(path.join(settings.game_dir, './www/')));
  
  //Mount client files
  var options = {
    require: [  path.join(__dirname, '../client/engine.js'),
                path.join(settings.game_dir, './client.js'),
                'events',
                'dnode' ],
  };
  if(settings.debug) {
    options.watch = true;
  }
  else {
    options.watch = false;
    options.filter = require("uglify-js");
  }
  server.use(require('browserify')(options));

  //Attach OpenID handler
  attachOpenID(server, function(res, user_id) {
    var now = (new Date()).toGMTString();
  
    res.setHeader('content-type', 'text/html');
    res.setHeader('last-modified', now);
    res.setHeader('date', now);
    res.statusCode = 200;
  
    res.write(client_start);
    res.write(sessions.setToken(user_id));
    res.end(client_end);
  });

  return server;
}

//Starts the game
function startGame(db, server) {
  //Create gateway
  require("./gateway.js").createGateway(db, server, sessions, game_module, function(err, gateway) {
    if(err) {
      throw err;
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
    var server = createServer();
    startGame(db, server);
  });
} 

startServer();

if(settings.debug) {
  var repl = require('repl');
  repl.start('Admin> ');
}
