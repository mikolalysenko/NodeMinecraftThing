var fs = require('fs'),
    util = require('util');

//Why can't express do this automatically? :(
exports.mount = function mount(server, cache) {
  
  //Add listener
  server.use(function(req, res, next) {
    util.log("Got request: " + req.url);
  
    if(req.url in cache) {
      var doc = cache[req.url];
      
      res.setHeader('content-type', doc.type);
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
    }
    else {
      next();
    }
  }); 
}

