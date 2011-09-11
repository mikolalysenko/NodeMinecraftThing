//The player component

function PlayerComponent() {
};

//Add extra features for player entity
PlayerComponent.prototype.register = function(entity) {
  entity.active = false;
};


