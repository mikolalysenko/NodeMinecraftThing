
var engine = null;

function chatListener(button) {
  if(button !== 'chat') {
    return;
  }

  var chatbox = document.getElementById('uiChatBox');  
  chatbox.style.display = 'block';
  engine.input.setActive(false);
  chatbox.focus();
}

exports.init = function(e_) {

  engine = e_;

  var canvas = document.getElementById('renderCanvas'),
      gamePane = document.getElementById('gamePane'),
      chatbox = document.getElementById('uiChatBox');
  
  engine.input.emitter.on('press', chatListener);
  
  window.onresize = function() {
    gamePane.width  = window.innerWidth;
		gamePane.height = window.innerHeight;
		canvas.width    = window.innerWidth;
		canvas.height   = window.innerHeight;
  };
          
  gamePane.style.display = 'block';
  window.onresize();

  chatbox.onfocus = function() {
    engine.input.setActive(false);
  }
  chatbox.onblur = function() {
    engine.input.setActive(true);
    chatbox.style.display = 'none';
  }
  chatbox.onkeydown = function(ev) {
    if(chatbox.style.display == 'none') {
      return false;
    }
    if(ev.keyCode === 13) {
      var mesg = chatbox.value;
      chatbox.value = "";
      if(engine.instance && mesg.length > 0) {
        engine.instance.action('chat', engine.playerEntity(), mesg);
      }
    }
    if(ev.keyCode === 9 || ev.keyCode === 13) {
      setTimeout(function() {
        chatbox.style.display = 'none';
        engine.input.setActive(true);
        gamePane.focus();
      }, 0);
      return false;
    }
    return true;
  }
}

exports.deinit = function(engine) {

  engine.input.emitter.removeListener('press', chatListener);

  window.onresize = null;
  engine.render.setActive(false);
  document.getElementById('gamePane').style.display = 'none';
  document.getElementById('renderCanvas').style.display = 'none';
}

