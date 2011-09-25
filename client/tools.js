var linalg = require('./linalg.js');

exports.renderPosition = function(entity, t) {
  var n = entity.state, p = entity.last_state;
  return linalg.hermite(p.position, p.velocity, n.position, n.velocity, t);
  //return linalg.lerp(p.position, n.position, t);
}
