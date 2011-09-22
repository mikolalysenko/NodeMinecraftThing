exports.init = function(engine) {
  var createPane = document.getElementById('createPane');
  createPane.style.display = 'block';
}

exports.deinit = function(engine) {
  var createPane = document.getElementById('createPane');
  createPane.style.display = 'none';
}

