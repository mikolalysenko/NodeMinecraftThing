#!/bin/sh
./mongo/mongod --config=data/config.txt &
sleep 1
node main.js &
