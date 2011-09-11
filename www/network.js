//Interface with the web server
"use strict";

var Network = {};

(function() {

//Network state variables
Network.connected = false;
Network.rpc = null;

//Local call backs from the server
var local_interface = {
  
};

//Initialize the network interface
Network.init = function(cb) {
  DNode(local_interface).connect(function(remote) {
    Network.connected = true;
    Network.remote_interface = remote;
    cb(null);
  });
};

})();


