#!/bin/sh
./mongo/mongod --config=mongo/config.txt &
sleep 1
node server/main.js > server.log &
