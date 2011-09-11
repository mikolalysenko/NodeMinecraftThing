"use strict";

//Preloads game data in the background
var Loader = { 
	text :
	[
		"shaders/simple.vs",
		"shaders/simple.fs",
		"shaders/shadow.fs",
		"shaders/shadow.vs",
		"shaders/shadow_init.fs",
		"shaders/shadow_init.vs",
		"shaders/simple_color.vs",
		"shaders/simple_color.fs"
	],
	
	images :
	[
	],

  sounds :
  [
  ],
};

(function() {

  Loader.data = {};
  
  var finished = false,
      completed = 0, 
      pending = 0,
      onprogress = null,
      oncomplete = null;

  var progress_handler = function(url) {
    ++completed;
    if(completed == pending) {
      finished = true;
      if(oncomplete) {
        oncomplete();
      }
    } else if(onprogress) {
      onprogress(completed, pending, url);
    }
  };
  
  var fetchText = function(url, cb) {
	  ++pending;
  
	  var XHR = new XMLHttpRequest();
	  XHR.open("GET", url, true);

	  XHR.onreadystatechange = function() {
		  if(XHR.readyState == 4) {
			  if(XHR.status == 200 || XHR.status == 304 || XHR.status == 0) {
				  Loader.data[url] = XHR.responseText;
				  progress_handler(url);
			  }
			  else {
				  error_handler("Error loading text file: " + url);
			  }
		  }
	  }

	  XHR.send(null);
  };

  var fetchImage = function(url, cb) {
    ++pending;
	  var img = new Image();
	  img.onload = function() {
	    ++completed;
		  Loader.data[url] = img;
		  progress_handler(url);
	  };
	  img.onerror = function() {
	    error_handler("Error loading image: " + url);
	  };
	  img.src = url;
  };
  
  var fetchAudio = function(url, error_handler) {
    ++pending;
    var audio = new Audio();
    audio.onload = function() {
      ++completed;
      Loader.data[url] = audio;
      progress_handler(url);
    };
    audio.onerror = function() {
      error_handler("Error loading audio: " + url);
    };
    audio.src = url;
  };

  //Initializes the loader
  Loader.init = function(error_handler) {
    var i;
    for(i=0; i<Loader.text.length; ++i) {
      fetchText(Loader.text[i], error_handler);
    }
    
    for(i=0; i<Loader.sounds.length; ++i) {
      fetchAudio(Loader.sounds[i], error_handler);
    }
    
    for(i=0; i<Loader.images.length; ++i) {
      fetchImage(Loader.images[i], error_handler);
    }
  };
  
  
  //Waits until the loader is completed
  Loader.listenProgress = function(progress) {
    if(onprogress) {
      var tprog = onprogress;
      onprogress = function(c, p, u) {
        progress(c, p, u);
        tprog(c, p, u);
      };
    }
    else {
      onprogress = progress;
    }
  };
  
  //Listens for a completed event in the loader
  Loader.listenCompleted = function(complete) {    
    if(finished) {
      setTimeout(complete, 1);
      return;
    }

    if(oncomplete) {
      var tcomp = oncomplete;
      oncomplete = function() {
        completed();
        tcomp();
      }
    }
    else {
      oncomplete = completed;
    }
  };

})();
