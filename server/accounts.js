

function AccountManager(db, game_module) {
  this.db = db;
  this.game_module = game_module;
}

AccountManager.prototype.getAccount = function(user_id, cb) {
  cb(null, {});
}

AccountManager.prototype.getPlayer = function(user_id, player_name, cb) {
  cb(null, {});
}

AccountManager.prototype.createPlayer = function(user_id, player_name, options, cb) {
  cb(null, {});
}

exports.AccountManager = AccountManager;
