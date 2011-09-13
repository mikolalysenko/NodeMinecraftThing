
var PositionComponent = {};

if(typeof(exports) !== "undefined") {
  PositionComponent = exports;
}

(function(){


PositionComponent.init = function(instance) {  
};

PositionComponent.deinit = function(instance) {
};

PositionComponent.register = function(entity) {
  var state = entity.state;
  if(!state.position) {
    state.position = [0,0,0];
  }
  if(!state.rotation) {
    state.rotation = 0;
  }
};

})();
