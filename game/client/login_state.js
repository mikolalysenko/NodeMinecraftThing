var logging_in = false;

exports.init = function(engine) {

  var loginPane = document.getElementById('loginPane');
  loginPane.style.display = 'block';
  
  var loginButton   = document.getElementById('loginButton'),
      loginName     = document.getElementById('loginName'),
      loginPassword = document.getElementById('loginPassword'),
      loginError    = document.getElementById('loginError');

/*
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
      App.setState(LoadState);
    });
    
    loginPassword.value = "";
  };
*/
}

exports.deinit = function(engine) {
  var loginPane = document.getElementById('loginPane'),
      loginButton   = document.getElementById('loginButton'),
      loginPassword = document.getElementById('loginPassword');
  
  loginPane.style.display = 'none';
  loginButton.onclick = null;
  loginPassword.value = "";
}

