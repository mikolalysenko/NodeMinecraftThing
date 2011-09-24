function LoginHandler(engine) {
  this.engine   = engine;
  this.players  = [];
  this.account  = null;
}

LoginHandler.prototype.init = function(cb) {
  var login = this,
      rpc   = this.engine.network.rpc;
  rpc.login(login.engine.session_id, function(err, account, players) {
    if(err) {
      throw Error(err);
    }
    login.account = account;
    login.players = players;
    setTimeout(cb, 0);
  });
}

LoginHandler.prototype.createPlayer = function(options, cb) {
  var login = this,
      rpc   = this.engine.network.rpc;
  rpc.createPlayer(options, function(err, player) {
    if(!err) {
      login.players.push(player);
    }
    setTimeout(function() { cb(err, player); }, 0);
  });
}

LoginHandler.prototype.deletePlayer = function(player_name, cb) {
  var login = this,
      rpc   = this.engine.network.rpc;
  rpc.deletePlayer(player_name, function(err) {
    if(!err) {
      for(var i=0; i<login.players.length; ++i) {
        if(login.players[i].player_name === player_name) {
          login.players.splice(i, 1);
          break;
        }
      }
    }
    setTimeout(function() { cb(err); }, 0);
  });
}

LoginHandler.prototype.joinGame = function(player_name) {
  var login = this,
      rpc   = this.engine.network.rpc;
  rpc.joinGame(player_name, function(err, player_rec) {
    if(err) {
      throw Error(err);
    }
    login.engine.notifyJoin(player_rec);
  });
}

exports.LoginHandler = LoginHandler;
