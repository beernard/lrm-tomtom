Leaflet Routing Machine / TomTom
================================

Extends [Leaflet Routing Machine](https://github.com/perliedman/leaflet-routing-machine) with support for [TomTom](http://developer.tomtom.com/io-docs).

Some brief instructions follow below, but the [Leaflet Routing Machine tutorial on alternative routers](http://www.liedman.net/leaflet-routing-machine/tutorials/alternative-routers/) is recommended.

## Installing

Install nodejs/iojs, clone this repository and execute:

```sh
npm install
./scripts/dist.sh
```

Put the script after Leaflet and Leaflet Routing Machine has been loaded.

To use with for example Browserify:

```sh
npm install --save lrm-tomtom
```

## Using

There's a single class exported by this module, `L.Routing.TomTom`. It implements the [`IRouter`](http://www.liedman.net/leaflet-routing-machine/api/#irouter) interface. Use it to replace Leaflet Routing Machine's default OSRM router implementation:

```javascript
var L = require('leaflet');
require('leaflet-routing-machine');
require('lrm-tomtom'); // This will tack on the class to the L.Routing namespace

L.Routing.control({
    router: new L.Routing.TomTom('your TomTom API key'),
}).addTo(map);
```

Note that you will need to pass a valid TomTom API key to the constructor.
