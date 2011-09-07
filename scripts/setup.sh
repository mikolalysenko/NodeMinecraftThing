#!/bin/sh

#Install libraries from apt
sudo apt-get install curl bison openssl libssl-dev binutils g++ gcc

#Check if node exists
node=`which node 2>&1`
ret=$?
if [ $ret -ne 0 ] || ! [ -x "$node" ]; then
  echo "Installing node"
  mkdir -p node
  cd node
  curl http://nodejs.org/dist/v0.5.5/node-v0.5.5.tar.gz > node.tgz
  tar xzf node.tgz
  cd node-v0.5.5
  ./configure
  make
  sudo make install
  cd ../..
  rm -rf node
fi

#Check if npm exists
npm=`which npm 2>&1`
ret=$?
if [ $ret -ne 0 ] || ! [ -x "$npm" ]; then
  echo "Installing npm"
  mkdir -p npm
  cd npm
  curl http://npmjs.org/install.sh > install.sh
  sudo sh install.sh
  cd ..
  rm -rf npm
fi

#Download npm packages
echo "Installing NPM packages"
npm install socket.io
npm install mongodb

#Download and unzip mongodb locally
mongo=`which mongo/mongo 2>&1`
ret=$?
if [ $ret -ne 0 ] || ! [ -x "$mongo" ]; then
  echo "Installing local copy of mongodb"
  rm -rf mongo
  mkdir -p mongo
  cd mongo
  
  mongourl="http://downloads.mongodb.org/linux/mongodb-linux-i686-static-1.8.3.tgz"
  if [ `uname -m` -eq "x86_64" ]; then
    mongourl="http://fastdl.mongodb.org/linux/mongodb-linux-x86_64-static-legacy-1.8.3.tgz"
  fi
  curl $mongourl  > mongo.tgz
  tar xzf mongo.tgz
  mv mongodb-linux-i686-static-1.8.3/bin/* .
  rm -rf mongodb-linux-i686-static-1.8.3 mongo.tgz
  cd ..
fi

#Compile protojs
echo "Compiling protojs"
cd scripts/protojs
./bootstrap.sh
make
cd ../..

#Build protocol buffers
./scripts/build_proto.js

#Configure the database
./scripts/setup_db.sh
