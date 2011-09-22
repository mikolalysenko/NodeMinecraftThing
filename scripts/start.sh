#!/bin/sh
google-chrome --ignore-gpu-blacklist http://localhost:8080/ &
gedit &
./mongo/mongod --config=mongo/config.txt

