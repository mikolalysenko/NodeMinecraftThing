"use strict";

//Preloads game data in the background
var Loader = { 
	text :
	[
	],
	
	images :
	[
	  "spritesheet.png",
	],

  sounds :
  [
  ],
  
  emitter : new EventEmitter(),
};

(function() {

  Loader.data = {};
  
  var completed = 0, 
      pending = 0,
      finished = false;

  function progress_handler(url) {
    ++completed;
    Loader.emitter.emit('progress', url, completed, pending);
    if(completed >= pending) {
      Loader.emitter.emit('finished');
    }
  };
  
  function fetchText(url) {
	  ++pending;
  
	  var XHR = new XMLHttpRequest();
	  XHR.open("GET", url, true);

	  XHR.onreadystatechange = function() {
		  if(XHR.readyState == 4) {
			  if(XHR.status == 200 || XHR.status == 304 || XHR.status == 0) {
				  Loader.data[url] = XHR.responseText;
				  Loader.emitter.emit('text', url, XHR.responseText);
				  progress_handler(url);
			  }
			  else {
			    Loader.emitter.emit('error', url);
			  }
		  }
	  }

	  XHR.send(null);
  };

  function fetchImage(url) {
    ++pending;
	  var img = new Image();
	  img.onload = function() {
		  Loader.data[url] = img;
		  Loader.emitter.emit('image', url, img);
		  progress_handler(url);
	  };
	  img.onerror = function() {
	    Loader.emitter.emit('error', url);
	  };
	  img.src = url;
  };
  
  function fetchAudio(url) {
    ++pending;
    var audio = new Audio();
    audio.onload = function() {
      Loader.data[url] = audio;
      Loader.emitter.emit('audio', url, audio);
      progress_handler(url);
    };
    audio.onerror = function() {
			    Loader.emitter.emit('error', url);
    };
    audio.src = url;
  };

  //Initializes the loader
  Loader.init = function() {
    var i;
    for(i=0; i<Loader.text.length; ++i) {
      fetchText(Loader.text[i]);
    }
    for(i=0; i<Loader.sounds.length; ++i) {
      fetchAudio(Loader.sounds[i]);
    }
    for(i=0; i<Loader.images.length; ++i) {
      fetchImage(Loader.images[i]);
    }
    finished = true;
  };
  
  //Called upon crashing
  Loader.deinit = function() {
    Loader.emitter.removeAllListeners();
  };
  
  //Listens for a completed event in the loader
  Loader.listenFinished = function(listener) {    
    if(finished && completed >= pending) {
      setTimeout(listener, 10);
      return;
    }
    else {
      Loader.emitter.on('finished', listener);
    }
  };

})();
