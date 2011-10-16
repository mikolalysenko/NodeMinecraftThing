
var engine = null,
    update_ping_interval = null;

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
      chatbox = document.getElementById('uiChatBox'),
      ping_ui = document.getElementById('uiPing');
  
  
  window.onresize = function() {
    gamePane.width  = window.innerWidth;
		gamePane.height = window.innerHeight;
		canvas.width    = window.innerWidth;
		canvas.height   = window.innerHeight;
  };
          
  gamePane.style.display = 'block';
  window.onresize();

  engine.input.emitter.on('press', chatListener);
  
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
        engine.instance.message('chat', mesg);
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
  
  update_ping_interval = setInterval(function() {
    uiPing.innerHTML = engine.network.ping;
  });
}

exports.deinit = function(engine) {

  engine.input.emitter.removeListener('press', chatListener);

  window.onresize = null;
  engine.render.setActive(false);
  document.getElementById('gamePane').style.display = 'none';
  document.getElementById('renderCanvas').style.display = 'none';
  
  clearInterval(update_ping_interval);
}

