var linalg = require('./linalg.js');

exports.renderPosition = function(entity, t) {
  var n = entity.state, p = entity.last_state;
  return linalg.hermite(p.position, p.velocity, n.position, n.velocity, t);
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
