var util = require('util');

function AccountManager(db, game_module, region_set) {
  this.db = db;
  this.game_module = game_module;
  this.region_set = region_set;
}

AccountManager.prototype.getAccount = function(user_id, cb) {

  //If user is temporary, create a random account for them
  if(user_id === "temporary") {
    user_id = "temp" + Math.random();
  }
  
  var db = this.db;
  db.accounts.findOne({'user_id':user_id}, function(err, account) {
  
    if(err) {
      cb(err, null);
    }
    else if(account) {
      if(account.logged_in) {
        cb("Already logged in", null);
      }
      else {
        db.accounts.update(account, { '$set': { logged_in : true } }, {safe:true}, function(err) {
          cb(err, account);
        });
      }
    }
    else {
      var account = { 'user_id': user_id, logged_in: true };
      db.accounts.save(account, function(err) {
        cb(err, account);
      });
    }
  });
}

AccountManager.prototype.closeAccount = function(account_id, cb) {
  this.db.accounts.update({_id:account_id}, {'$set': {logged_in:false}}, {safe:true}, cb);
}

AccountManager.prototype.listAllPlayers = function(account_id, cb) {

  var db = this.db,
      players = [];
      
  db.players.find({'account_id':account_id}, function(err, cursor) {
    if(err) {
      cb(err, null);
      return;
    }
    cursor.each(function(err, player) {
      if(err) {
        cb(err, null);
      }
      else if(player) {
        players.push(player);
      }
      else {
        cb(null, players);
      }
    });
  });
}

//Create player
AccountManager.prototype.createPlayer = function(account, options, cb) {

  if(!options.player_name ||
    typeof(options.player_name) != 'string') {
    cb("Missing player_name field", null);
    return;
  }
  
  if(!options.player_name.match(/^[a-z0-9]+$/i)) {
    cb("Invalid player name", null);
    return;
  }
  
  var db = this.db,
      game_module = this.game_module,
      region_set = this.region_set;
      
  //Check if player name exists already
  db.players.findOne({'player_name':options.player_name}, function(err, player) {
    if(err) {
      cb(err, null);
      return;
    }
    else if(player) {
      cb("Player name already in use", null);
      return;
    }
    
    //Create the player
    var player_rec, entity_rec, region_name;
    try {
      var data = game_module.createPlayer(account, options);
      player_rec  = data[0];
      entity_rec  = data[1];
      region_name = data[2];
    }
    catch(err) {
      cb(err, null);
      return;
    }
        
    //Set player account
    player_rec.account_id = account._id;
    
    //Get region id
    var region_id = region_set.lookupRegionName(region_name);
    if(!region_id) {
      cb("Player region is missing/instance server is offline");
      return;
    }
    entity_rec.region_id = region_id;
    
    //Add to database
    db.entities.save(entity_rec, function(err0) {
      player_rec.entity_id = entity_rec._id;
      db.players.save(player_rec, function(err1) {
        cb(err0 || err1, player_rec);
      });
    });
  });
}


AccountManager.prototype.getPlayer = function(account_id, player_name, cb) {
  this.db.players.findOne({'player_name':player_name, 'account_id':account_id}, function(err, player) {
    if(err) {
      cb(err, null);
    }
    else if(!player) {
      cb("Player not found", null);
    }
    else {
      cb(null, player);
    }  
  });
}


AccountManager.prototype.deletePlayer = function(account_id, player_name, cb) {
  util.log("Deleting player: " + player_name + ", account_id: " + account_id);

  var db = this.db;
  db.players.findOne({'player_name':player_name, 'account_id':account_id}, function(err, player) {
    if(err) {
      cb(err);
      return;
    }
    else if(!player) {
      cb("Player does not exist");
      return;
    }
    else {
      db.players.remove({_id:player._id}, cb);
    }
  });
}

exports.AccountManager = AccountManager;
