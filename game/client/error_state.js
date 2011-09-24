var nogl_state = false;

exports.init = function(engine) {
  if(nogl_state) {
    document.getElementById('noGLPane').style.display = 'block';
  }
  else {
  	document.getElementById('errorPane').style.display = 'block';
  }
}

exports.deinit = function(engine) {
	document.getElementById('errorPane').style.display = 'none';
  document.getElementById('noGLPane').style.display = 'none';
}

exports.postError = function(msg) {

  if(typeof(msg) != "string") {
    try {
      if(msg instanceof Error) {
        msg = "Error: " + msg.message + " at " + msg.stack;
      }
      else {
        msg = JSON.stringify(msg);
      }
    }
    catch(err) {
      msg = '' + msg;
    }
  }

  if(msg.search(/webgl/i) >= 0) {
    nogl_state = true;
  	document.getElementById('errorPane').style.display = 'none';
    document.getElementById('noGLPane').style.display = 'block';
    document.getElementById('videoItem').innerHTML = '<iframe width="560" height="345" src="http://www.youtube.com/embed/bV8Yus_atoE" frameborder="0" allowfullscreen></iframe>';
  }
  else {
	  msg = msg.replace(/\&/g, '&amp;')
			   .replace(/\</g, '&lt;')
			   .replace(/\>/g, '&gt;')
			   .replace(/\n/g, '<br/>')
	       .replace(/\s/g, '&nbsp;');
			   
	  document.getElementById('errorReason').innerHTML += '<p>' + msg + '</p>';
  }
}

