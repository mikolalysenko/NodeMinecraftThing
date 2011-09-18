var util = require('util'),
    path = require('path'),
    fs   = require('fs'),
    mount = require('./mount.js').mount;

//----------------------------------------------------------------
// The Rules object manages the interface between game logic
// and the actual engine.
//
// It actually has three major responsibilities:
//    
//    1.  Initialize the game and database state at application startup.
//
//    2.  Remap the data and files defined by the game to virtual
//        locations on the web site for the client to address them.
//
//    3.  Connect instance callbacks to game logic.
//
//----------------------------------------------------------------
function Rules(game_dir, db) {

  util.log("Loading game from: " + game_dir);

  this.game_dir     = game_dir
  this.game_module  = require(path.join(game_dir, 'index.js'));
  
  this.db           = db;
  this.gateway      = null;
  
  this.components     = {};
  this.entity_types   = this.game_module.entityInfo.entityTypes;
  this.voxel_types    = this.game_module.voxelInfo.voxelTypes;
  this.regions        = this.game_module.regionInfo.regions;
};

exports.Rules = Rules;

//----------------------------------------------------------------
// Functions for initializing the world and players
//----------------------------------------------------------------
Rules.prototype.initializeWorld = function(db, cb) {
  
  var game_module = this.game_module;
  
  var createWorld = function() {
  
    //Create all the entities
    var regions         = game_module.regionInfo.regions,
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
        db.chunks.remove({}, function(err3) {
          var err = err0 || err1 || err2 || err3;
          if(err) {
            cb(err);
            return;
          }
          createWorld();
        });
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
    player_rec.entity_id = entity_rec._id;
    db.players.save(player_rec, function(err1) {
      cb(err0 || err1, player_rec, entity_rec);
    });
  });
};



//----------------------------------------------------------------
// Functions for mounting client files
//----------------------------------------------------------------
Rules.prototype.setVirtualMountPoints = function(server, cb) {

  //Create header for client file
  var rules             = this,
      game_dir          = this.game_dir,
      game_module       = this.game_module,
      component_info    = game_module.componentInfo,
      entity_info       = game_module.entityInfo,
      voxel_info        = game_module.voxelInfo,
      sprite_info       = game_module.spriteInfo;
      
      
  //Writes the header for the client file
  function clientHeader() {
    return  '"use strict";\n' +
            'var Components, EntityTypes, VoxelInfo, SpriteInfo;\n' +
            '(function() { ' + 
            fs.readFileSync(path.join(__dirname, 'fake_require.js'), 'utf-8');
  };
  
  //Computes client footer
  function clientFooter() {
    return '})();\n';
  };
      
  //Mounts component information
  function clientComponentInfo() {
    var result      = 'Components={',
        components  = component_info.components;
    
    for(var name in components) {
      var component       = components[name],
          component_path  = path.join(game_dir, component.path);
      
      if(component.server) {
        rules.components[name] = require(component_path);
      }
      
      if(component.client) {
        result += 
          '"' + name + '":' +
          '(function(){var exports={};(function(){\n' + 
            fs.readFileSync(component_path, 'utf-8') + 
          '\n})();return exports;})(),';        
      }
    }
    
    return result + '};\n';
  };
  
  //Computes client entity info
  function clientEntityInfo() {
    var entity_types  = rules.entity_types,
        result        = 'EntityTypes={\n';
    for(var t in entity_types) {
      var type = entity_types[t];
      if(type.client) {
        result += '"' + t + '":' + JSON.stringify(type) + ',\n';
      }
    }
    return result + '};\n';
  }
  
  //Client voxel info
  function clientVoxelInfo() {
    return "";
  };
  
  //Client sprite info
  function clientSpriteInfo() {
    return "";
  };

  //Construct the client file
  var client_mtime = fs.statSync(path.join(this.game_dir, 'index.js')).mtime,
      client_file  = "";
  client_file += clientHeader();
  client_file += clientComponentInfo();
  client_file += clientEntityInfo();
  client_file += clientVoxelInfo();
  client_file += clientSpriteInfo();
  client_file += clientFooter();
        
  util.log("Generated client file = \n" + client_file);
  util.log("Last modified: " + client_mtime);
  
  
  
  //Mount files  
  function createMountData(filename, filetype) {
    return { 
      src: fs.readFileSync(filename),
      type: filetype,
      modified: fs.statSync(filename).mtime,
    };
  };
  mount(server, {
    '/game_client.js'    : { 
      src:client_file, 
      modified:client_mtime, 
      type:'text/javascript'
    },
    '/spritesheet.png' : createMountData(
        path.join(game_dir, sprite_info.spriteSheet), 'image/png'),
    '/voxels.png': createMountData(
        path.join(game_dir, voxel_info.voxelTexture), 'image/png'),
    '/voxels.js': createMountData(
        path.join(__dirname, 'voxels.js'), 'text/javascript'),
    '/linalg.js' : createMountData(
        path.join(__dirname, '/linalg.js'), 'text/javascript'),
    '/patcher.js' : createMountData(
        path.join(__dirname, '/patcher.js'),  'text/javascript'),
  });      
   
  //Callback
  cb(null);
}



//----------------------------------------------------------------
// Callbacks for connecting game logic into server data
//----------------------------------------------------------------

//Attaches this game rules object to a given gateway
Rules.prototype.registerGateway = function(gateway) {
  this.gateway = gateway;
};

//Registers an instance
Rules.prototype.registerInstance = function(instance) {

  //Register with region
  var regions = this.regions;
  for(var i=0; i<regions.length; ++i) {
    var region = regions[i];
    if(region.region_name == instance.region.region_name) {
      region.registerInstance(instance);
      break;
    }
  }

  //Register all the components to the instance too!
  for(var id in this.components) {
    this.components[id].registerInstance(instance);
  }

  //Register with the game module
  this.game_module.registerInstance(instance);
}

//Registers an entity
Rules.prototype.registerEntity = function(entity) {

  //Look up type
  var type_name = entity.state['type'];
  if(!type_name) {
    util.log("Warning!  Entity with missing type_name: " + JSON.stringify(entity.state));
    return;
  }
  var type = this.entity_types[type_name];
  if( !type ) {
    util.log("Warning!  Unkown entity type: " + typeName);
    return;
  }
  entity.type = type;
  
  //Register components
  for(var i=0; i<type.components.length; ++i) {
    this.components[type.components[i]].registerEntity(entity);
  }
  
  //Register with game module
  this.game_module.registerEntity(entity);
}

//Registers a player upon connecting to the game
Rules.prototype.registerPlayer = function(player) {
  this.game_module.registerPlayer(player);
}

