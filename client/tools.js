var linalg = require('./linalg.js'),
    motion = require('./components/motion_component.js');

var getPosition = motion.getPosition,
    getVelocity = motion.getVelocity;

exports.renderPosition = function(entity, t) {
  var tc  = entity.instance.region.tick_count,
      p   = entity.last_state,
      pp  = getPosition(tc-1, p), 
      pv  = getVelocity(tc-1, p), 
      np  = entity.position, 
      nv  = entity.velocity;
  return linalg.hermite(pp, pv, np, nv, t);
};

exports.lower_bound = function (arr, y) {
  var lo=0, hi=arr.length, m, x;
  while(lo+1 < hi) {
    m = (lo + hi) >> 1;
    x = arr[m];
    if( x > y ) {
      hi = m;
    } else if( x < y ) {
      lo = m;
    } else {
      return m;
    }
  }
  return lo;
};
