//Trivial JSON object patcher

var patcher = (typeof(exports) == "undefined" ? {} : exports);

(function(){

function clone(obj) {
  if(typeof(obj) != "object") {
    return obj;
  }
  if(obj instanceof Array) {
    var result = new Array(obj.length);
    for(var i=0; i<result.length; ++i) {
      result[i] = clone(obj[i]);
    }
    return result;
  }
  else {  
    var result = {}
    for(var i in obj) {
      result[i] = clone(obj[i]);
    }
    return result;
  }
}

//Assumes that prev and next are both objects
function computeAndApplyPatch(prev, next) {
  var updates = [ ], removals = [ ], children = [ ], i;
  
  if(next instanceof Array) {
    //Array case
    var plength = prev.length;
    if(prev.length != next.length) {
      for(var i=prev.length-1; i>next.length; --i) {
        removals.push(i);
      }
      prev.length = next.length;
    }
    
    for(i=next.length-1; i>=0; --i) {
      if(i < plength) {
        var ptype = typeof(prev[i]), ntype = typeof(next[i]);
        if(ptype == ntype) {
          if(ntype == "object" && (prev[i] instanceof Array) == (next[i] instanceof Array) ) {
            //Object case
            var res = computeAndApplyPatch(prev[i], next[i]);
            if( res[0].length != 0 || res[1].length != 0 || res[2].length == 0 )
              children.push( [i, res ] );
            continue;
          } else if(prev[i] == next[i]) {
            //Pod case
            continue;
          }
        }
      }
      prev[i] = clone(next[i]);
      updates.push([i, prev[i]]);
    }
  } else {
    //Object case
    for(i in prev) {
      if(!(i in next)) {
        removals.push(i);
      }
    }
    for(i=removals.length-1; i>=0; --i) {
      delete prev[removals[i]];
    }
    for(i in next) {
      if(i in prev) {
        var ptype = typeof(prev[i]), ntype = typeof(next[i]);
        if(ptype == ntype) {
          if(ntype == "object" && (prev[i] instanceof Array) == (next[i] instanceof Array) ) {
            //Object case
            var res = computeAndApplyPatch(prev[i], next[i]);
            if( res[0].length != 0 || res[1].length != 0 || res[2].length == 0 )
              children.push( [i, res ] );
            continue;
          } else if(prev[i] == next[i]) {
            //Pod case
            continue;
          }
        }
      }
      prev[i] = clone(next[i]);
      updates.push([i, prev[i]]);
    }
  }
  return [updates, removals, children];
};


function applyPatch(obj, patch) {
  var updates = patch[0], removals = patch[1], children = patch[2], i;
  for(i=0; i<removals.length; ++i) {
    delete obj[removals[i]];
  }
  for(i=0; i<updates.length; ++i) {
    obj[updates[i][0]] = updates[i][1];
  }
  for(i=0; i<children.length; ++i) {
    applyPatch(obj[children[i][0]], children[i][1]);
  }
};

patcher.applyPatch = applyPatch;
patcher.computeAndApplyPatch = computeAndApplyPatch;

})();




