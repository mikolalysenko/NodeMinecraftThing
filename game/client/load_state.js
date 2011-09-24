var loadingInterval = null;


//Just randomly move the progress bar to make the user think something is happening
// (easier to implement than actual loading stats)
function progressFunc() {
  progressBar.innerHTML += '.';
  loadingInterval = setTimeout(progressFunc, Math.random() * 2000 + 500);
}

exports.init = function(engine) {

  var progressPane = document.getElementById('progressPane'),
      progressBar  = document.getElementById('progressBar');
  progressPane.style.display = 'block';

  progressBar.innerHTML = 'Loading';
  progressFunc();
  
  var files_loaded    = false,
      chunks_loaded   = false;
  function checkLoaded() {
    if(files_loaded && chunks_loaded) {
      engine.setState(engine.game_module.states.game_state);
    }
  }
  
  engine.loader.listenFinished(function() {
    files_loaded = true;
    console.log("Files loaded");
    checkLoaded();
  });
  
  engine.listenLoadComplete(function() {
    chunks_loaded = true;
    console.log("Chunks loaded");
    checkLoaded();
  });
}

exports.deinit = function(engine) {
  document.getElementById('progressPane').style.display = 'none';
  
  if(loadingInterval) {
    clearTimeout(loadingInterval);
    loadingInterval = null;
  }
}
