var process       = require("process"),
    path          = require("path"),
    child_process = require("child_process"),
    mongodb       = require("mongodb"),
    DNode         = require("dnode");

//FIXME: Parse out arguments
var db_name   = "gamedb",
    db_server = "localhost",
    db_port   = 27017;

var web_portnum = 8080;

var worker_start_count = 4,
    worker_port_range_start = 9001,
    worker_last_port = worker_port_range[0];

//The client interface to the workers



//The array of all instance workers
var instance_workers = [];

//An instance worker helper class
function InstanceWorker() {

  this.process = null;
  this.portnum = worker_last_port++;
  this.regions = {};
  this.connection = null;
  
};

InstanceWorker.prototype.io_event = function(data) {
  console.log("Worker " + this.process.pid + ": " + data);
}

InstanceWorker.prototype.start = function(errcallback, callback) {
  
  this.process = child_process.spawn("node", ["instance_server.js", this.portnum, db_name, db_server, db_port], {});
  
  var initialized = false;
  
  this.process.stdout.on('data', function(data) {
    if(!initialized) {
      console.log("Worker " + this.process.pid + " subprocess successfully initialized!");
      initialized = true;
      callback(null);
    }
    this.process.stdout.on('data', this.io_event);
  });
  
  this.process.stderr.on('data', this.io_event);
  
  this.process.on('exit', function(reason) {
    callback({errno:reason, text:"subprocess died");; 
  });
};



