module.exports = function(config,env) {
      const Influx = require('influx');

      let influx = null;

      const _initInflux = async function() {
        influx = new Influx.InfluxDB({
              host: config.influxdb_host,
              port: config.influxdb_port,
              database: config.influxdb_database,
              username: config.influxdb_username,
              password: config.influxdb_password
        });
        try {
          influx.createDatabase(config.influxdb_database)
        } catch(e) {
          // in case already exists
        }
        return;
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

          influx.writePoints([
                {
                  measurement: json.meterId,
                  fields: { reading: json.readings[i].reading,time:json.readings[i].timeStamp}
                }
          ]);
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
      }
      addHandlers();
}
