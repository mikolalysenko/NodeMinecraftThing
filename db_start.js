var mongodb = require("mongodb");

//Starts a database connection and adds a reference for each table
exports.initializeDB = function(db_name, db_server, db_port, next) {

  var db = new mongodb.Db(db_name, new mongodb.Server(db_server, db_port, {}), {})

  db.open(function(err, db){

    if(err) {
      console.log("Error connecting to database");
      return;
    }
    
    function addCollection(col, cb) {
      db.collection(col, function(err, collection) {
        if(err) {
          console.log("Error adding collection '" + col + "': " + err);
          return;
        }
        db[col] = collection;
        cb();
      });
    }
    
    addCollection('entities', function() { 
      addCollection('players', function() { 
        addCollection('regions', function() {
          next(db);
        }); 
      });
    });
  });
}

