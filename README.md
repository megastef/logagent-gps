# Logagent input plugin: logagent-gps

[Logagent](https://sematext.com/logagent) plugin to track the GPS position of with USB / serialport GPS mouse.  


## install Logagent & plugin

```
npm i -g @sematext/logagent
npm i -g logagent-gps
```

## Configuration 

```
input: 
  gps: 
    module: logagent-gps
    comPort: '/dev/tty.usbmodemFA1221'
    # Emit only locationevent, so no logout would be generated
    # useful to share location with other plugins, listening to 'location' event
    @ without generating 'data.raw' event for Logagent
    emitOnlyLocationEvent: false
    # enable debug output
    debug: true

output: 
  stdout: yaml
  sematext-cloud: 
    module: elasticsearch
    url: https://logsene-receiver.sematext.com
    index: YOUR_LOGSENE_TOKEN

```

## Run Logagent

```
logagent --config gps-location.yml
```