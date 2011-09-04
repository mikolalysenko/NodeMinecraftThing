var server = require("./server.js").createStaticHttpServer("www", "common", "common"),
    io = require("socket.io").listen(server);

io.sockets.on('connection', function(socket) {

  socket.emit("news", { hello: "world" });
  
  socket.on("my other event", function(data) {
    console.log(data);
  });
});

server.listen(8000);
