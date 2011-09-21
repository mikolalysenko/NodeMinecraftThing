var nogl_state = false;

exports.init = function() {
  if(nogl_state) {
    return;
  }
	document.getElementById('errorPane').style.display = 'block';
}

exports.deinit = function() {
	document.getElementById('errorPane').style.display = 'none';
  document.getElementById('noGLPane').style.display = 'none';
}

exports.postError = function(msg) {

  if(msg.search(/webgl/i)) {
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

