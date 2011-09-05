#!/bin/sh

echo "Reinitializing the database"
rm -rf data/db data/*.log data/keyfile

#Create database directory
echo "Creating database directory"
mkdir -p data/db

#Create key file
echo "Creating keyfile"
keydata=`dd if=/dev/urandom bs=96 count=1 | base64`
echo $keydata > data/keyfile
chmod 600 data/keyfile

#Run mongodb set up script
echo "Configuring mongodb"

#Start server
./mongo/mongod --config=data/config.txt &
sleep 2

#Connect to server and execute script
echo 'use admin;
db.addUser("administrator","'$keydata'");
db.createCollection("players");
db.players.ensureIndex({playerName: 1}, {unique : true});
db.createCollection("entities");
db.entities.ensureIndex({region: 1});
db.createCollection("regions");
db.shutdownServer();' | ./mongo/mongo 127.0.0.1

