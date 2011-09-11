"use strict";

var LoginState = { };

(function(){

  LoginState.init = function(cb) {
    var loginPane = document.getElementById('loginPane');
    loginPane.style.display = 'block';
    
    var loginButton   = document.getElementById('loginButton'),
        loginName     = document.getElementById('loginName'),
        loginPassword = document.getElementById('loginPassword'),
        loginError    = document.getElementById('loginError');
  
    loginButton.onclick = function() {
    
      var player_name = loginName.value,
          password    = loginPassword.value;

      Network.rpc.joinGame(player_name, password, function(err) {
        if(err) {
          loginError.innerHTML = err;
          return;
        }
        
        App.setState(Game);
      });
      
      loginPassword.value = "";
    };
    
    cb(null);
  };
  
  LoginState.deinit = function(cb) {
  
    var loginPane = document.getElementById('loginPane');
    loginPane.style.display = 'none';
    
    var loginButton   = document.getElementById('loginButton');
    loginButton.onclick = null;
    
    cb(null);
  };
  
})();
