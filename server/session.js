function SessionHandler() {
  this.tokens = {};
}

SessionHandler.prototype.setToken = function(user_id) {
  //FIXME: Use a cryptographically secure method for generating tokens...
  var token = Date.now() + ":" + Math.random(),
      login = this;

  var handler = function() {
    if(token in login.tokens) {
      delete login.tokens[token];
    }  
  }
  
  var timeout = setTimeout(handler, 60*1000);
  
  this.tokens[token] = {
    'user_id': user_id,
    'timeout': timeout,
  };
  
  return token;
}

SessionHandler.prototype.getToken = function(token) {
  var toks    = this.tokens,
      session = toks[token];
  if(session) {
    clearTimeout(session.timeout);
    delete toks[token];
    return session.user_id;
  }
  
  return null;
}

exports.SessionHandler = SessionHandler;
