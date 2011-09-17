"use strict";

var LoginState = { };

(function(){

  var logging_in = false;

  LoginState.init = function(cb) {
    var loginPane = document.getElementById('loginPane');
    loginPane.style.display = 'block';
    
    var loginButton   = document.getElementById('loginButton'),
        loginName     = document.getElementById('loginName'),
        loginPassword = document.getElementById('loginPassword'),
        loginError    = document.getElementById('loginError');
  
    loginButton.onclick = function() {

      if(logging_in) {
        loginError.innerHTML = "Processing...";
        return;
      }
      logging_in = true;
    
      var player_name = loginName.value,
          password    = loginPassword.value;
      
      Network.rpc.joinGame(player_name, password, {}, function(err) {
        logging_in = false;
        
        if(err) {
          loginError.innerHTML = err;
          return;
        }
        
        //Start running the game
        Game.init();
        
        //Enter loading state
        App.setState(LoadState);
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
