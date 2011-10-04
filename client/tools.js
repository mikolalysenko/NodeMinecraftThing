var linalg = require('./linalg.js'),
    motion = require('./components/motion_component.js');

var computePosition = motion.computePosition;

exports.computePosition = computePosition;

exports.renderPosition = function(entity, t) {
  var tc  = entity.instance.region.tick_count,
      p   = entity.last_state,
      pp  = computePosition(tc-1, p), 
      pv  = p.velocity, 
      pt  = tc - p.motion_start_tick,
      n   = entity.state,
      np  = computePosition(tc, n), 
      nv  = n.velocity,
      nt  = tc - n.motion_start_tick;
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
