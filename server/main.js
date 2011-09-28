var path = require('path'),
    url  = require('url'),
    fs   = require('fs'),
    util = require('util'),
    querystring = require('querystring');

exports.bootStrap = function(settings) {


//Game server module
var game_module = require(path.join(settings.game_dir, '/server.js')),
    framework   = require('./framework.js');
for(var i in game_module.components) {
  game_module.components[i].registerFramework(framework);
}

//Session handler
var sessions = new (require('./session.js').SessionHandler)();

function addCollections(db, next) {
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
}

//Connects to database, adds references for collections
function initializeDB(next) {
  var mongodb   = require('mongodb'),
      db_name   = settings.db_name,
      db_server = settings.db_server,
      db_port   = settings.db_port,
      db_user   = settings.db_user,
      db_passwd = settings.db_passwd,
      db = new mongodb.Db(db_name, new mongodb.Server(db_server, db_port, {}), {});

  db.open(function(err, db) {
    if(err) {
      util.log("Error connecting to database");
      return;
    }
    
    console.log("HERE!");
    if(db_user || db_passwd) {
      db.authenticate(db_user, db_passwd, function(err) {
        if(err) {
          util.log("Error authenticating with database");
          return;
        }
        addCollections(db, next);
      });
    }
    else {
      addCollections(db, next);
    }
  });
}


//Attaches an open ID provider
function attachOpenID(server, login) {

  var openid = require('openid'),
  
      relying_party = new openid.RelyingParty(
        settings.web_url + '/verify',
        null,
        false,
        false,
        []),
      
      providers = game_module.openid_providers;

  //Add handler to server      
  server.use(function(req, res, next) {
  
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
      
      if(provider == "temp") {
      
        //Make a temporary account
        res.writeHead(302, {Location: settings.web_url + '/verify?temp=1'});
        res.end();
      }
      else {
      
        //Otherwise, verify through OpenID
        relying_party.authenticate(provider, false, function(error, auth_url) {
          if(error || !auth_url) {
            util.log("Authentication with provider failed!");
            res.writeHead(200);
            res.end('Authentication with provider failed');
          }
          else {
            res.writeHead(302, {Location: auth_url});
            res.end();
          }
        });
      }
    }
    else if(parsed_url.pathname === '/verify') {

      var query         = querystring.parse(parsed_url.query),
          temporary     = query.temp;
          
      if(temporary) {
        //Create temporary account and add to game
        login(res, "temporary");
      }
      else {
        
        relying_party.verifyAssertion(req, function(error, result) {
          if(error || !result || !result.claimedIdentifier) {
            res.writeHead(302, {Location: '/index.html'});
            res.end();
          }
          else {
            //Log in to database, send response
            login(res, result.claimedIdentifier);
          }
        });
      }
    }
    else {
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
  server.use(connect.static(path.join(__dirname, '../client/www/')));
  
  //Mount client files
  var options = {
    require: [  path.join(__dirname, '../client/engine.js'),
                path.join(settings.game_dir, './client.js'),
                'events',
                'dnode' ],
  };
  if(settings.debug) {
    options.watch = true;
    options.filter = function(src) {
      return '"use strict;"\n' + src;
    };
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

//Resets the whole database
function resetGame(db, cb) {
  //Only reset if called for
  if(!settings.RESET) {
    cb();
    return;
  }

  var createWorld = function() {
  
    //Create all the regions
    var regions         = game_module.regions,
        pending_regions = regions.length;
    for(var i=0; i<regions.length; ++i) {
    
      //Unpack region for database serialization
      var region = {
        region_name : regions[i].region_name,
        brand_new   : true,
      };
      
      util.log("Creating region: " + JSON.stringify(region));
      
      //Save the region to the database
      db.regions.save(region, function(err) {
        if(err) {
          throw err;
        }
        if(--pending_regions == 0) {
          util.log("GAME DATABASE RESET");
          cb();
        }
      });
    }
  };
  
  //Clear out database and create the world
  util.log("CLEARING GAME DATABASE");
  db.entities.remove({}, function(err0) {
    db.regions.remove({}, function(err1) {
      db.players.remove({}, function(err2) {
        db.chunks.remove({}, function(err3) {
          db.accounts.remove({}, function(err4) {
            var err = err0 || err1 || err2 || err3 || err4;
            if(err) {
              throw err;
            }
            createWorld();
          });
        });
      });
    });
  });
}

//Start the server
function startServer() {

  util.log("Starting server...");
  
  initializeDB(function(db) {
    resetGame(db, function() {
      var server = createServer();
      startGame(db, server);
    });
  });
} 

process.on('uncaughtException', function(err) {
  util.log("Uncaught exception: " + err.stack);
});

startServer();

if(settings.debug) {
  var repl = require('repl');
  repl.start('Admin> ');
}

};
