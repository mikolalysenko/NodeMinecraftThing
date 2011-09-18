var util = require('util'),
    mongodb = require("mongodb");

//Starts a database connection and adds a reference for each table
exports.initializeDB = function(db_name, db_server, db_port, next) {

  var db = new mongodb.Db(db_name, new mongodb.Server(db_server, db_port, {}), {})

  db.open(function(err, db){

    if(err) {
      util.log("Error connecting to database");
      return;
    }
    
    function addCollection(col, cb) {
      db.collection(col, function(err, collection) {
        if(err) {
          util.log("Error adding collection '" + col + "': " + err);
          return;
        }
        db[col] = collection;
        cb();
      });
    }
    
    addCollection('entities', function() {
      addCollection('players', function() { 
        db.players.ensureIndex([['player_name',1]], true, function() {
          addCollection('regions', function() {
            addCollection('chunks', function() {
              db.chunks.ensureIndex([['region_id',1]], false, function() {
                next(db);
              });
            });
          }); 
        });
      });
    });
  });
}

