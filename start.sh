#!/bin/sh

nohup influxd run &
echo "Wait for Influxd"
sleep 20
influx -database ccde -execute 'CREATE DATABASE ccde'
pm2 start casa-corrently-container
pm2 logs
