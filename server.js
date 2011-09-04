var http = require("http"),
	url = require("url"),
	fs = require("fs"),
	io = require("socket.io");
	

var server = http.createServer()
server.listen;
var socket = io.listen(server);


socket.sockets.on("connection", function(socket) {
	socket.emit("news", {hello : "world"});
	socket.on("my other event", function(data) {
		console.log("data");
	});
});
