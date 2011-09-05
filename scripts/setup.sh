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
  cd ..
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
  curl http://downloads.mongodb.org/linux/mongodb-linux-i686-static-1.8.3.tgz > mongo.tgz
  tar xzf mongo.tgz
  mv mongodb-linux-i686-static-1.8.3/bin/* .
  rm -rf mongodb-linux-i686-static-1.8.3 mongo.tgz
  cd ..
fi

#Create database directory
echo "Creating database directory"
mkdir -p data/db

#Create key file
echo "Creating keyfile"
rm data/keyfile
passwd=dd if=/dev/urandom bs=96 count=1 | base64
echo $passwd > data/keyfile
chmod 600 data/keyfile

#Run mongodb set up script
echo "Configuring mongodb"
./mongo/mongod --config=data/config.txt &
sleep 2

echo 'use admin;
db.addUser("admin", $passwd);
db.shutdownServer();' > ./mongo/mongo 127.0.0.1

