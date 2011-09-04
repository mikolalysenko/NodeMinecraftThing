var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs");
	
function fixPath(uri) {
  return path.normalize(uri.replace(/\.\.|\~/g, "").replace(/\/\//g,"/"));
}

function serveFile(filename, response) {
   fs.stat(filename, function(err, stats) {
    if(err) {
      console.log("File not found: " + filename);
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 There's no file here sir\n");
      response.end();
      return;
    }
    
    if(stats.isDirectory()) {
      serveFile(path.join(filename, "/index.html"), response);
      return;
    }
    
    console.log("Serving file: " + filename);
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {
        console.log("Error fetching file");
        console.log(err);
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.end("500 Too many potatoes");
        return;
      }
      
      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
  });
}

exports.createStaticHttpServer = function(wwwroot, commonroot, commonpath) {
  return http.createServer(function(request, response) {
    var uri = fixPath(url.parse(request.url).pathname),
        parts = uri.split("/"),
        filename;
    
    //Fix leading /
    if(parts.length > 0 && parts[0] == '') {
      parts.shift();
    }
    
    if(parts.length == 0) {
      serveFile(path.join(wwwroot, "index.html"), response);
    }
    else if(parts[0] == commonpath) {
      serveFile(path.join(commonroot, parts.slice(1).join("/")), response);
    }
    else {
      serveFile(path.join(wwwroot, uri), response);
    }
  });
};

