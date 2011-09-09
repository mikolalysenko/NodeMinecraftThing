var process           = require("process"),
    path              = require("path"),
    child_process     = require("child_process"),
    mongodb           = require("mongodb"),
    DNode             = require("dnode");

//FIXME: Parse out arguments
var db_name   = "gamedb",
    db_server = "localhost",
    db_port   = 27017;

var web_ports     = 8080;

var worker_ports  = [ ];


//The array of all instance workers
var instance_connections  = [],
    pending_connections   = 0,
    regions_map           = {};


//A connection to an instance
function InstanceConnection() {

}

function connectToInstanceServer(port, cb) {
}


function initializeConnections(cb) {
  for(var i=0; i<worker_portnums.length; ++i) {
    connectToInstanceServer(worker_ports[i]);
  }
}

function startInstance(region_id) {
}




