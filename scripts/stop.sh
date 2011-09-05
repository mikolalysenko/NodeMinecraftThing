#!/bin/sh
pkill -9 node
passwd=cat data/keyfile
echo 'use admin
db.auth("admin", $passwd);
db.shutdownServer();' | mongo/mongo 127.0.0.1

