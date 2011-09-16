var util = require('util'),
    path = require('path'),
    fs   = require('fs'),
    mount = require('./mount.js').mount;

//----------------------------------------------------------------
// The Rules object manages the interface between game logic
// and the actual engine.
//
//  It takes the data from the game directory and turns it into
//  actual objects
//----------------------------------------------------------------
function Rules(game_dir) {

  util.log("Loading game from: " + game_dir);

  this.game_dir     = game_dir
  this.game_module  = require(path.join(game_dir, 'index.js'));
  
  this.db           = null;
  this.gateway      = null;
  
  this.components   = {};
  this.entityTypes  = {};
};


//Parses out game data and binds variables for client
Rules.prototype.init = function(server, cb) {
  
  var rules             = this,
      game_dir          = this.game_dir,
      game_module       = this.game_module,
      components        = game_module.components,
      entityTypes       = game_module.entityTypes,
      client_components = {},
      server_components = {},
      client_file       = 
        '"use strict";\nvar Components, EntityTypes; (function() { ' + 
          fs.readFileSync(path.join(__dirname, 'fake_require.js'), 'utf-8'),
      client_mtime      = fs.statSync(path.join(this.game_dir, 'index.js')).mtime;
      
  //First initialize the components
  function loadComponents() {
    
    client_file += 'Components={';
    for(var i=0; i<components.length; ++i) {
      var component = components[i],
          component_path = path.join(game_dir, component.path);
      
      if(component.server) {
        server_components[component.name] = require(component_path);
      }
      
      if(component.client) {
        client_components[component.name] = true;
      
        var src = fs.readFileSync(component_path, 'utf-8'),
            mtime = fs.statSync(component_path).mtime;
        client_file += '"' + component.name + '":(function(){var exports={};(function(){\n' + src + '\n})();return exports;})(),';        
        if(mtime > client_mtime) {
          client_mtime = mtime;
        }
      }
    }
    client_file += '};\n';
    
    //Store in rules object
    rules.components = server_components;
  }

  function makeClientType(template) {
    return template;
  }
  
  function makeServerType(template) {
    return template;
  }
  
  //Next, initialize entity templates
  function loadTypes() {
  
    client_file += 'EntityTypes={\n';
    for(var i=0; i<entityTypes.length; ++i) {
      var template    = entityTypes[i];
      if(template.client) {
        client_file += '"' + template.name + '":' + JSON.stringify(makeClientType(template)) + ',\n';
      }
      if(template.server) {
        rules.entityTypes[template.name] = makeServerType(template);
      }
    }
    client_file += '};\n';
  }

  loadComponents();
  loadTypes();
    
  client_file += '})();\n';
      
  //Add sprites and animations
  client_file += fs.readFileSync(path.join(game_dir, '/sprites/index.js'), 'utf-8');
  var sprite_mtime = fs.statSync(path.join(game_dir, '/sprites/index.js')).mtime;
  if(sprite_mtime > client_mtime) {
    client_mtime = sprite_mtime;
  }
      
  util.log("Generated client component file = \n" + client_file);
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
    '/components.js'    : { 
      src:client_file, 
      modified:client_mtime, 
      type:'text/javascript'
    },
    '/patcher.js' : createMountData(
        path.join(__dirname, '/patcher.js'),  'text/javascript'),
    '/spritesheet.png' : createMountData(
        path.join(game_dir, '/sprites/spritesheet.png'), 'image/png'),
    '/linalg.js' : createMountData(
        path.join(__dirname, '/linalg.js'), 'text/javascript'),
  });      
   
  //Callback
  cb(null);
}

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
      region.registerInstance(instance);
      break;
    }
  }
  
  //Register all the components to the instance too!
  for(var id in this.components) {
    this.components[id].registerInstance(instance);
  }
}

//Registers an entity
Rules.prototype.registerEntity = function(entity) {

  var type_name = entity.state['type'];
  if(!type_name) {
    util.log("Warning!  Entity with missing type_name: " + JSON.stringify(entity.state));
    return;
  }
  
  //Look up type
  var type = this.entityTypes[type_name];
  if( !type ) {
    util.log("Warning!  Unkown entity type: " + typeName);
    return;
  }
  entity.type = type;
  
  //Register components
  for(var i=0; i<type.components.length; ++i) {
    this.components[type.components[i]].registerEntity(entity);
  }
}

//Registers a player upon connecting to the game
Rules.prototype.registerPlayer = function(player) {
  this.game_module.registerPlayer(player);
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
    player_rec.entity_id = entity_rec._id;
    db.players.save(player_rec, function(err1) {
      cb(err0 || err1, player_rec, entity_rec);
    });
  });
};

exports.Rules = Rules;

