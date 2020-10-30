#!/bin/sh

echo ################################## Prepare System
apt update
apt upgrade -y
apt install -y sudo curl apt-utils wget build-essential make gcc g++

echo ################################## Install InfluxDB
wget -qO- https://repos.influxdata.com/influxdb.key | sudo apt-key add -
source /etc/lsb-release
echo "deb https://repos.influxdata.com/${DISTRIB_ID,,} ${DISTRIB_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/influxdb.list
deb https://repos.influxdata.com/ubuntu focal stable

apt update && sudo apt install -y influxdb influxdb-client

systemctl unmask influxdb.service
systemctl start influxdb
systemctl enable influxdb.service

influx user create -n corrently -p casa

echo ################################## Install Node JS
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
apt-get install -y nodejs

echo ################################## Install Casa Corrently Container
npm install -g casa-corrently-core-container --unsafe-perm
npm install -g pm2
