exports.init = function(engine) {
  var loginPane = document.getElementById('loginPane'),
      playerList = document.getElementById('playerList'),
      loginButton = document.getElementById('loginButton'),
      createButton = document.getElementById('createButton');
      
  loginPane.style.display = 'block';
  
  
  var players = engine.login.players;
  playerList.innerHTML = '<form id=playerSelect>'
  for(var i=0; i<players.length; ++i) {
    playerList.innerHTML += '<input type=radio name=playerValue value="' + players[i].player_name + '">' + players[i].player_name + '<br/>'
  }
  playerList.innerHTML += '</form>'

  loginButton.onclick = function() {
    var playerValues = document.getElementsByName('playerValue');
    for(var i=0; i<playerValues.length; ++i) {
      if(playerValues[i].checked) {
        engine.login.joinGame(playerValues[i].value, function() {
        
          //TODO: Join game
          
        });
        break;
      }
    }
  };  
  
  createButton.onclick = function() {
    engine.setState(require('./create_state.js'));
  };
}

exports.deinit = function(engine) {
  var loginPane = document.getElementById('loginPane');
  loginPane.style.display = 'none';
}

