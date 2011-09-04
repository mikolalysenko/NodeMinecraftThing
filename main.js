var server = require("./server.js");

var s = server.createStaticHttpServer("www");
s.listen(8000);
