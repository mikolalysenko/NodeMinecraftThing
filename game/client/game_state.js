
exports.init = function(engine) {
  document.getElementById('gamePane').style.display = 'block';
  console.log("IN GAME STATE");
}

exports.deinit = function(cb) {
  document.getElementById('gamePane').style.display = 'none';
}

