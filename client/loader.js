var EventEmitter  = require('events').EventEmitter,
    emitter       = new EventEmitter(),
    engine        = null,
    pending       = 0,
    completed     = 0,
    initialized   = false,
    data          = {};
    
    
exports.deinit = function() {
  initialized = false;
  emitter.removeAllListeners();
}
    
emitter.on('file', function(url, file) {
  data[url] = file;
  ++completed;
  if(initialized && pending === completed) {
    emitter.emit('finished');
  }
});

exports.data = data;

exports.fetchImage = function(url) {
  ++pending;
  var img = new Image();
  img.onload = function() {
	  emitter.emit('file', url, img);
  };
  img.onerror = function() {
    throw Error("Error loading image: " + url);
  };
  img.src = url;
}

exports.fetchText = function(url) {
  ++pending;

  var XHR = new XMLHttpRequest();
  XHR.open("GET", url, true);

  XHR.onreadystatechange = function() {
	  if(XHR.readyState == 4) {
		  if(XHR.status == 200 || XHR.status == 304 || XHR.status == 0) {
			  emitter.emit('file', url, XHR.responseText);
		  }
		  else {
		    throw Error("Error loading text: " + url);
		  }
	  }
  }

  XHR.send(null);
}

exports.fetchAudio = function(url) {
  ++pending;
  var audio = new Audio();
  audio.onload = function() {
    emitter.emit('file', url, audio);
  };
  audio.onerror = function() {
    throw Error("Error loading audio file: " + url);
  };
  audio.src = url;

}

exports.listenFinished = function(cb) {
  function wrap() {
    try {
      cb();
    }
    catch(err) {
      engine.crash(err);
    }
  };

  if(initialized && pending === completed) {
    setTimeout(wrap, 0);
  }
  else {
    emitter.on('finished', wrap);
  }
}

exports.setReady = function() {
  initialized = true;
  if(pending == completed) {
    emitter.on('finished');
  }
}

exports.init = function(engine_) {
  engine = engine_
}

