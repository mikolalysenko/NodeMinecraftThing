var linalg = require('./linalg.js');

exports.renderPosition = function(entity, t) {
  var n = entity.state, p = entity.last_state;
  
  var pp = [0,0,0], pv = p.velocity, np = [0,0,0], nv = n.velocity,
      tc = instance.region.tick_count,
      pt = tc - p.motion_start_tick,
      nt = tc - n.motion_start_tick;
  
  for(var i=0; i<3; ++i) {
    pp[i] = p.position[i] + pv[i] * pt;
    np[i] = n.position[i] + nv[i] * nt;
  }
  
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
