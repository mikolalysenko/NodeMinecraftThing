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
  this.components   = this.game_module.components;
  
  this.db           = null;
  this.gateway      = null;
};

//Attaches this game rules object to a given gateway
Rules.prototype.register = function(gateway) {
  this.db      = gateway.db;
  this.gateway = gateway;
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
      var record = {
        region_name : regions[i].region_name
      };
      
      util.log("Creating region: " + JSON.stringify(record));
      
      //Save the region to the database
      db.regions.save(record, function(err, region) {
        setTimeout(function() {
          if(err) {
            util.log("Error creating region!");
          }
          
          //FIXME: Create entities in this region
          
          if(--pending_regions == 0) {
            cb(null);
          }
        }, 0);
      });
    }
  };
  
  //Clear out database and create the world
  util.log("!!!!CLEARING GAME DATABASE!!!!!");
  db.entities.remove({}, function(err, r) {
    db.regions.remove({}, function(err, r) {
      db.players.remove({}, function(err, r) {
        setTimeout(function() {
          if(err) {
            cb(err);
            return;
          }
          createWorld();
        }, 0);
      });
    });
  });  
};

//Returns the initial state for a player
Rules.prototype.createPlayerEntity = function(player_name, cb) {
  
  //Compute player spawn position
  var player_spawn = this.game_module.playerSpawn(player_name);
  if(!('region' in player_spawn)) {
    cb("Missing region data in playerSpawn");
    return;
  }
  
  //Look up region id
  var region_id = this.gateway.lookupRegion(player_spawn.region);
  
  if(!region_id) {
    cb("Player region is missing/instance server is offline");
    return;
  }
  
  var record = {
    'player_name' : player_name,
    region_id     : region_id,
    type          : 'player',
  };
  
  this.db.entities.save(record, function(err, player) {
    cb(err, record);
  });
};

//Adds components to an entity
Rules.prototype.initializeComponents = function(entity) {

  //FIXME: For now does nothing
};

exports.Rules = Rules;

