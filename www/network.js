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
  DNode(local_interface).connect(function(remote, connection) {
    Network.connected = true;
    Network.rpc       = remote;
    
    connection.on('end', function() {
      App.crash("Lost connection to network");
    });
    
    cb(null);
  });
};

})();


