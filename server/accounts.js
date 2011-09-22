

function AccountManager(db, game_module) {
  this.db = db;
  this.game_module = game_module;
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
        cb(err, "Already logged in");
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
AccountManager.prototype.createPlayer = function(account_id, player_name, options, cb) {

  //Check if player name exists already

  var data = this.game_module.createPlayer(player_name, options),
      player_rec  = data[0],
      entity_rec  = data[1],
      region_name = data[2];
  
  //Set player account
  player_rec.account_id = account_id;
  
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
}


AccountManager.prototype.getPlayer = function(account_id, player_name, cb) {
  cb(null, {});
}


AccountManager.prototype.deletePlayer = function(account_id, player_name, cb) {
}

exports.AccountManager = AccountManager;
