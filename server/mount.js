var fs = require('fs'),
    util = require('util');

//Why can't express do this automatically? :(
exports.mount = function mount(server, file_list, cb) {

  var cache = {},
      num_files = 0,
      errors = "";
  
  //Called when complete
  function check_done() {
    if(num_files == 0) {
      cb( errors == "" ? null : errors );
    }
  }
  
  //Mount all the files
  for(var i in file_list) {
  
    ++num_files;
    (function() {
      var bound_name = i, 
          file_name = file_list[i];
          
      util.log("Caching file: " + bound_name + " \\ " + file_name);
      
      fs.stat(file_name, function(err0, stat) {
        fs.readFile(file_name, function(err1, data) {
          --num_files;
          if(err0 || err1) {
            errors += "Error reading file: " + path_name  + " -- " + file_name + " : " + err0 + " / " + err1;
          }
          else {
            cache[bound_name] = { src : data, modified : stat.mtime };
          }
          check_done();
        });
      });
    })();
  }
  
  
  //Add listener
  server.use(function(req, res, next) {
    util.log("Got request: " + req.url);
  
    if(req.url in cache) {
      var doc = cache[req.url];
      
      res.setHeader('content-type', 'text/javascript');
      res.setHeader('last-modified', doc.modified.toGMTString());
      res.setHeader('date', new Date().toGMTString());
      
      var last_client_mod = req.headers['if-modified-since'];
      if (last_client_mod) {
          if (new Date(last_client_mod) >= doc.modified) {
              res.statusCode = 304;
              res.end();
              return;
          }
      }
      
      res.statusCode = 200;
      res.end(doc.src);
      console.log("here!!!");
    }
    else {
      next();
    }
  });
 
 
  //Check if we are done
  check_done(); 
}

