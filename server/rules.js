var util = require('util'),
    path = require('path');

//----------------------------------------------------------------
// The Rules object manages the interface between game logic
// and the actual engine.
//
//  It takes the data from the game directory and turns it into
//  actual objects
//----------------------------------------------------------------
function Rules(gamedir) {

  util.log("Loading game from: " + gamedir);

  this.game_module  = require(path.join(gamedir, 'index.js'));
  
  this.db           = null;
  this.gateway      = null;
};

//Attaches this game rules object to a given gateway
Rules.prototype.registerGateway = function(gateway) {
  this.db      = gateway.db;
  this.gateway = gateway;
}

//Registers an instance
Rules.prototype.registerInstance = function(instance) {

  var regions = this.game_module.regions;
  
  for(var i=0; i<regions.length; ++i) {
    var region = regions[i];
    if(region.region_name == instance.region.region_name) {
      region.register(instance);
      break;
    }
  }
}

//Registers an entity
Rules.prototype.registerEntity = function(entity) {
}

//Registers a player upon connecting to the game
Rules.prototype.registerPlayer = function(player) {
}

//Create the game world from scratch
Rules.prototype.initializeWorld = function(db, cb) {
  
  var game_module = this.game_module;
  
  var createWorld = function() {
  
    //Create all the entities
    var regions = game_module.regions,
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
          util.log("Error creating region!");
        }
        
        if(--pending_regions == 0) {
          cb(null);
        }
      });
    }
  };
  
  //Clear out database and create the world
  util.log("!!!!CLEARING GAME DATABASE!!!!!");
  db.entities.remove({}, function(err0) {
    db.regions.remove({}, function(err1) {
      db.players.remove({}, function(err2) {
        var err = err0 || err1 || err2;
        if(err) {
          cb(err);
          return;
        }
        createWorld();
      });
    });
  });  
};

//Returns the initial state for a player
Rules.prototype.createPlayer = function(player_name, password, options, cb) {
  
  //Create player
  var data = this.game_module.createPlayer(player_name, options),
      player_rec  = data[0],
      entity_rec  = data[1],
      region_name = data[2];
  
  //Set player password
  player_rec.password = password;
  
  //Get region id
  var region_id = this.gateway.lookupRegion(region_name);
  if(!region_id) {
    cb("Player region is missing/instance server is offline");
    return;
  }
  entity_rec.region_id = region_id;
  
  //Add to database
  var db = this.db;
  db.entities.save(entity_rec, function(err0) {
    db.players.save(player_rec, function(err1) {
      player_rec.entity_id = entity_rec._id;
      cb(err0 || err1, player_rec, entity_rec);
    });
  });
};

exports.Rules = Rules;

