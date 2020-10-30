#!/bin/sh

nohup influxd run &
curl -XPOST 'http://localhost:8086/query' --data-urlencode 'q=CREATE DATABASE "ccde"'
pm2 start casa-corrently-container
pm2 logs
