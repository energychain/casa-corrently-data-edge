module.exports = function(config,env) {
      const Influx = require('influx');
      const fs = require('fs');
      let meterIds = {};

      let influx = null;

      const _initInflux = async function() {
        try {
          if(typeof  config.influxdb_database !== 'undefined') {
            influx = new Influx.InfluxDB({
                  host: config.influxdb_host,
                  port: config.influxdb_port,
                  database: config.influxdb_database,
                  username: config.influxdb_username,
                  password: config.influxdb_password
            });
          } else {
            // check with Defaults
            influx = new Influx.InfluxDB({
              database:'ccde'
            });
          }
        } catch(e) {

        }
        try {
          await influx.createDatabase(config.influxdb_database)
        } catch(e) {
          // in case already exists
        }
        return;
      }

      const getLast = async function(meterId) {
        if(influx == null) {
            await _initInflux();
        }
        return await influx.query('SELECT last("reading") as reading FROM "'+meterId+'"');
      }

      const archive = async function(json) {
        if(typeof json.meterId == 'undefined') {
          return { 'err': 'meterId missing' };
        }
        if((!Array.isArray(json.readings))||(json.readings.length==0)||(typeof json.readings[0].reading !== 'number')) {
          return { 'err': 'readings missing or nan' };
        }
        if(typeof json.timeStamp !== 'number') {
          json.timeStamp = new Date().getTime();
        }
        if(Array.isArray(config.meterIds)) {
          let allowed=false;
          for(let i=0;i<config.meterIds.length;i++) {
            if(config.meterIds[i] == json.meterId) allowed=true;
          }
          if(!allowed) {
            return { 'err': 'forbidden' };
          }
        }
        try {
        if(influx == null) {
            await _initInflux();
        }
        for(let i = 0; i< json.readings.length;i++) {
          if(typeof json.readings[i].timeStamp == 'undefined') json.readings[i].timeStamp = new Date().getTime();
          fields = { reading: json.readings[i].reading,time:json.readings[i].timeStamp};
          influx.writePoints([
                {
                  measurement: json.meterId,
                  fields: fields
                }
          ]);
          meterIds[json.meterId] = fields;
          env.ccde = meterIds;
        }
        } catch(e) {
            return { 'err': e.message};
        }
        return { 'status': 'ok', 'err':null};
      }

      const addHandlers = function() {
        let wwwroot = config.wwwroot || '';

        env.app.get(wwwroot + '/',async function (req, res) {
          let json = {};
          let status = {};
          let reading = {};
          if(typeof req.query.timeStamp !== 'undefined') {
            reading.timeStamp = req.query.timeStamp;
          }
          if(typeof req.query.reading !== 'undefined') {
            reading.reading = req.query.reading * 1;
          }
          if(typeof req.query.meterId !== 'undefined') {
            json.meterId = req.query.meterId;
          }
          json.readings = [];
          json.readings.push(reading);
          status = await archive(json);
          res.send(status);
        });
        env.app.post(wwwroot + '/',async function (req, res) {
            let json = req.body;
            let status = {};
            if(Array.isArray(json.readings)) {
              status = await archive(json);
            } else {
              json.readings = [json.readings];
              status = await archive(json);
            }
            res.send(status);
        });
        env.app.get(wwwroot + '/last',async function (req, res) {
          let last = {};
          last = await getLast(req.query.meterId);
          res.send(last);
        });
        env.app.get(wwwroot + '/meterIds',async function (req, res) {
          res.send(meterIds);
        });
        env.app.post(wwwroot + '/config',async function (req, res) {
          let conf = {
             "type":"InfluxDB Measurement Meter",
             "name":"Corrently Demozähler",
             "meterId":"influx-feedin",
             "isProduction":false,
             "prodMeterId":"influx-prod",
             "scaleFactor": 10000000,
             "revenue":0,
             "amortization":0,
             "source":"casa-corrently-influxdb-source",
             "community":"data-edge",
             "influxhost": "localhost",
             "influxdb": "ccde",
             "influxport": 8086,
             "influx_feedin_measurement": "",
             "influx_feedout_measurement": "",
             "influx_prod_measurement": "",
             "influx_feedin_field": "reading",
             "influx_feedout_field": "reading",
             "influx_prod_field": "reading"
          };
          conf.uuid = 'ccde_'+Math.round(Math.random()*1000000)+'_'+Math.round(Math.random()*1000000)
          conf.name = req.body.name;
          conf.stromkonto = req.body.stromkonto;
          conf.zip = req.body.zip;
          conf.depot = req.body.stromkonto;
          conf.revenue = req.body.revenue.replace(',','.') * 1;
          conf.amortization = req.body.amortization.replace(',','.') * 1;
          for (const [key, value] of Object.entries(req.body)) {
            if(key.substr(0,6) == 'meter_') {
                if(value == 'energy') {
                  conf.influx_feedin_measurement = key.substr(6);
                }
                if(value == 'energyOut') {
                  conf.influx_feedout_measurement = key.substr(6);
                }
                if(value == 'prod') {
                  conf.influx_prod_measurement = key.substr(6);
                }
            }
          }
          fs.writeFileSync(conf.uuid + ".json",JSON.stringify(conf));
          res.send({});
        });
      }
      addHandlers();
}
