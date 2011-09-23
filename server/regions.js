var util = require('util'),
    Instance = require('./instance.js').Instance;

//Manages a collection of regions
function RegionSet(db, game_module) {
  this.db           = db;
  this.game_module  = game_module;
  this.instances    = {};
  this.region_index = {};   //Index of instances keyed by region name
}

//Looks up a region name
RegionSet.prototype.lookupRegionName = function(region_name) {
  util.log("Looking up region: " + region_name);
  return this.region_index[region_name];
}

//Starts an instance
RegionSet.prototype.startInstance = function(region_rec, cb) {

  util.log("Starting instance: " + JSON.stringify(region_rec));
  var region_set = this,
      instance = new Instance(region_rec, this.db, this);
      
  //Register with region handler
  var regions = this.game_module.regions;
  for(var i=0; i<regions.length; ++i) {
    var region = regions[i];
    if(region.region_name === instance.region.region_name) {
      region.registerInstance(instance);
      break;
    }
  }

  //Register all the components to the instance too!
  var components = this.game_module.components;
  for(var id in components) {
    components[id].registerInstance(instance);
  }
  
  //Finally, register with the game module itself
  this.game_module.registerInstance(instance);

  //Now we can start the instance
  instance.start(function(err) {
    if(!err) {
      util.log("Region '" + region_rec.region_name +"', id=" + region_rec._id + " started successfully!");
      region_set.instances[region_rec._id] = instance;  
      region_set.region_index[region_rec.region_name] = region_rec._id;
    }
    cb(err);
  });
}

//Initialize all instances
RegionSet.prototype.init = function(cb) {

  //Start all of the regions
  var region_set  = this,
      db          = this.db;
  db.regions.find({ }, function(err, cursor) {
    if(err) {
      util.log("Error loading regions: " + err);
      cb(err);
      return;
    }
    
    var num_regions = 0, closed = false;
    function check_finished() {
      if(num_regions == 0 && closed) {
        cb(null);
      }
    }
    cursor.each(function(err, region) {  
      if(err) {
        util.log("Error enumerating regions: " + err);
        cb(err, null);
        return;
      }
      else if(region !== null) {      
        ++num_regions;
        region_set.startInstance(region, function(err) {
          if(err) {
            util.log("Error starting region instance: " + region + ", reason: " + err);
          }
          --num_regions;
          check_finished();
        });        
      }
      else {
        closed = true;
        check_finished();
      }
    });
  });
};


//Register entity
RegionSet.prototype.registerEntity = function(entity) {

  //Look up type
  var type_name = entity.state['type'];
  if(!type_name) {
    util.log("Warning!  Entity with missing type_name: " + JSON.stringify(entity.state));
    return;
  }
  var type = this.game_module.entity_types[type_name];
  if( !type ) {
    util.log("Warning!  Unkown entity type: " + typeName);
    return;
  }
  entity.type = type;
  
  //Register components
  for(var i=0; i<type.components.length; ++i) {
    this.game_module.components[type.components[i]].registerEntity(entity);
  }
  
  //Register with game module
  this.game_module.registerEntity(entity);
}

//Called when a player joins the game
RegionSet.prototype.addClient = function(player_rec, client, cb) {
  cb(null);
}

//Called when a player leaves the game
RegionSet.prototype.removeClient = function(client, cb) {
  cb(null);
}

exports.RegionSet = RegionSet;
