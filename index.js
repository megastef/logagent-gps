'use strict'
var stringify = require('fast-safe-stringify')
var SerialPort = require('serialport')
var geocoding = new require('reverse-geocoding')
var GPS = require('gps')

function getKey (gps) {
  return gps.state.lat.toFixed(3) + gps.state.lon.toFixed(3) + ''
}
function stderrLog (msg) {
  console.error(new Date() + ' pid[' + process.pid + ']: ' + msg)
}
var consoleLogger = {
  log: stderrLog,
  error: stderrLog,
  debug: stderrLog
}

function GPSTracker (config, eventEmitter) {
  this.config = config
  this.eventEmitter = eventEmitter
  this.comPort = new SerialPort(config.comPort || '/dev/tty.usbmodemFA1221', {
    baudRate: 4800,
    parser: new SerialPort.parsers.Readline(config.lineSeparator || '\n\r')
  })
}

GPSTracker.prototype.start = function () {
  var comPort = this.comPort
  var eventEmitter = this.eventEmitter
  var config = this.config
  var gps = new GPS()
  var locationCache = {}
  var lookupActive = false
  gps.on('data', function (data) {
    if (!gps.state) {
      return
    }
    var msg = {
      '@timestamp': gps.state.time,
      // use geoip field for SC geopoint mapping
      geoip: {
        location: [gps.state.lon, gps.state.lat]
      },
      location: {
        lat: gps.state.lat,
        lon: gps.state.lon,
        alt: gps.state.alt,
        address: locationCache[getKey(gps)],
        mapUrl: 'https://www.google.de/maps/search/maps+' + gps.state.lat + ',' + gps.state.lon
      },
      speed: gps.state.speed
    }
    var location = locationCache[getKey(gps)]
    if (!location && !lookupActive) {
      lookupActive = true
      var query = {
        latitude: gps.state.lat,
        longitude: gps.state.lon,
        map: 'google'
      }
      geocoding.location(query,
        function (err, res) {
          lookupActive = false
          if (err) {
            if (config.debug) {
              consoleLogger.log('GPS / Goolge reverse geocoder error: ' + err)
            }
          } else {
            if (res.results && res.results.length > 0) {
              locationCache[getKey(gps)] = res.results[0].formatted_address
              msg.location.address = res.results[0].formatted_address
            }
          }
        })
    }

    if (gps.state.lat !== null) {
      eventEmitter.emit('location', {geoip: msg.geoip, address: msg.location.address}, {sourceName: 'GPS'})

      if (!config.emitOnlyLocationEvent) {
        eventEmitter.emit('data.raw', stringify(msg))
      }
    }
    if (config.debug) {
      consoleLogger.log(stringify(msg))
    }
  })

  comPort.on('data', function (data) {
    try {
      gps.update(data.toString('utf-8'))
    } catch (err) {
      // ignore parse errors during startup
    }
  })
}

GPSTracker.prototype.stop = function (cb) {
  this.comPort.close()
  console.log('stop')
  if (cb) {
    cb()
  }
}

module.exports = GPSTracker

function test () {
  var EE = require('events')
  var eventEmitter = new EE()
  var p = new GPSTracker({
    comPort: '/dev/tty.usbmodemFA1221',
    debug: false,
    emitOnlyLocationEvent: false
  }, eventEmitter)
  eventEmitter.on('data.raw', console.log)
  eventEmitter.on('location', console.log)
  p.start()
  setTimeout(p.stop.bind(p), 60000)
}

if (require.main === module) {
  test()
}
