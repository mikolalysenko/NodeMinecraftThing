var loadingAnimationInterval = null;

exports.init = function(engine) {
  var createPane = document.getElementById('createPane'),
      createButton = document.getElementById('createSubmit'),
      createError = document.getElementById('createError'),
      createForm = document.getElementById('createForm');
      
  createPane.style.display = 'block';
  
  createError.innerHTML = "";
  
  
  var submitting = false;
  
  function submit() {
    if(submitting) {
      return false;
    }
    submitting = true;
  
    //Set status for button
    createError.innerHTML = "Processing";
    createButton.disabled = true;
      
    //Set up a loading animation to keep user distracted    
    loadingAnimationInterval = setInterval(function() {
      createError.innerHTML += '.';
    }, 1000);
    
    //Read out element
    var options = {},
        elements = createForm.elements;
    for(var i=0; i<elements.length; ++i) {
      options[elements[i].name] = elements[i].value;
    }
    
    //Call out to server
    engine.login.createPlayer(options, function(err, player) {
    
      submitting = false;
      if(loadingAnimationInterval) {
        clearInterval(loadingAnimationInterval);
        loadingAnimationInterval = null;
      }
      createButton.disabled = false;
      
      if(err) {
        createError.innerHTML = "Error: " + err;
        return;
      }
      
      //Create successful
      engine.setState(engine.game_module.states.login_state);
    });  
    
    return false;
  };
  
  
  createForm.onsubmit  = submit;
  createButton.onclick = submit;
}

exports.deinit = function(engine) {
  var createPane = document.getElementById('createPane');
  createPane.style.display = 'none';
  
  if(loadingAnimationInterval) {
    clearInterval(loadingAnimationInterval);
    loadingAnimationInterval = null;
  }
}

