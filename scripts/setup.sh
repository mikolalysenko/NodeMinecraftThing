#!/bin/sh

#Download and unzip mongodb files
rm -rf mongo
mkdir mongo
cd mongo
curl http://downloads.mongodb.org/linux/mongodb-linux-i686-static-1.8.3.tgz > mongo.tgz
tar xzf mongo.tgz
mv mongodb-linux-i686-static-1.8.3/bin/* .
rm -rf mongodb-linux-i686-static-1.8.3 mongo.tgz
cd ..

#Create database directory
mkdir data/db

#Create key file
dd if=/dev/urandom bs=96 count=1 | base64 > data/keyfile

