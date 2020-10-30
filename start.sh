#!/bin/sh

nohup influxd run &

pm2 start casa-corrently-container
pm2 logs
