(function() {
	'use strict';

	var L = require('leaflet');
	var corslite = require('corslite');

	L.Routing = L.Routing || {};

	L.Routing.TomTom = L.Class.extend({
		options: {
			serviceUrl: 'https://api.tomtom.com/routing/1/calculateRoute',
			timeout: 30 * 1000
		},

		initialize: function(apiKey, options) {
			this._apiKey = apiKey;
			L.Util.setOptions(this, options);
		},

		route: function(waypoints, callback, context, options) {
			var timedOut = false,
				wps = [],
				url,
				timer,
				wp,
				i;

			options = options || {};
			url = this.buildRouteUrl(waypoints, options);

			timer = setTimeout(function() {
								timedOut = true;
								callback.call(context || callback, {
									status: -1,
									message: 'TomTom request timed out.'
								});
							}, this.options.timeout);

			// Create a copy of the waypoints, since they
			// might otherwise be asynchronously modified while
			// the request is being processed.
			for (i = 0; i < waypoints.length; i++) {
				wp = waypoints[i];
				wps.push({
					latLng: wp.latLng,
					name: wp.name,
					options: wp.options
				});
			}

			corslite(url, L.bind(function(err, resp) {
				var data;

				clearTimeout(timer);
				if (!timedOut) {
					if (!err) {
						data = JSON.parse(resp.responseText);
						this._routeDone(data, wps, callback, context);
					} else {
						callback.call(context || callback, {
							status: -1,
							message: 'HTTP request failed: ' + err
						});
					}
				}
			}, this));

			return this;
		},

		_routeDone: function(response, inputWaypoints, callback, context) {
			var alts = [],
				mappedWaypoints,
				coordinates = [],
				i,
				path,
				summary = [],
				instructions,
				index = 0;

			context = context || callback;
			if (response.error && response.error.description) {
				callback.call(context, {
					status: -1,
					message: response.error.description
				});
				return;
			}

			for (i = 0; i < response.routes[0].legs.length; i++) {
				path = response.routes[0].legs[i];
				coordinates = coordinates.concat(this._decodePolyline(path.points));
				index += (path.points.length - 1);
				summary.push({ summary: path.summary, index: index });
			}

			instructions = this._convertInstructions(summary);
			mappedWaypoints = this._mapWaypointIndices(inputWaypoints, instructions, coordinates);

			alts = [{
				name: '',
				coordinates: coordinates,
				instructions: instructions,
				summary: this._convertSummary(summary),
				inputWaypoints: inputWaypoints,
				actualWaypoints: mappedWaypoints.waypoints,
				waypointIndices: mappedWaypoints.waypointIndices
			}];

			callback.call(context, null, alts);
		},

		_decodePolyline: function(geometry) {
			var coords = geometry,
				latlngs = new Array(coords.length),
				i;

			for (i = 0; i < coords.length; i++) {
				latlngs[i] = new L.LatLng(coords[i].latitude, coords[i].longitude);
			}

			return latlngs;
		},

		_toWaypoints: function(inputWaypoints, vias) {
			var wps = [],
				i;
			for (i = 0; i < vias.length; i++) {
				wps.push({
					latLng: L.latLng(vias[i]),
					name: inputWaypoints[i].name,
					options: inputWaypoints[i].options
				});
			}

			return wps;
		},

		buildRouteUrl: function(waypoints, options) {
			var locs = [],
				i;

			for (i = 0; i < waypoints.length; i++) {
				locs.push(waypoints[i].latLng.lat + ',' + waypoints[i].latLng.lng);
			}

			return this.options.serviceUrl + '/' +
				locs.join(':') +
				'/json' +
				'?key=' + this._apiKey;
		},

		_convertInstructions: function(summaries) {
			var result = [],
				i;

			// tomtom don't provide any instructions, but we will create instructions from summary
			for (i = 0; i < summaries.length; i++)
			{
				result.push({ distance: summaries[i].summary.lengthInMeters,
							  time: summaries[i].summary.travelTimeInSeconds,
							  type: (i == summaries.length - 1 ? "DestinationReached" : "WaypointReached"),
							  index: summaries[i].index });
			}

			return result;
		},

		_convertSummary: function(summaries) {
			var result = { totalDistance: 0,
						   totalTime: 0 },
				i;

			for (i = 0; i < summaries.length; i++) {
				result.totalDistance += summaries[i].summary.lengthInMeters;
				result.totalTime += summaries[i].summary.travelTimeInSeconds;
			}

			return result;
		},

		_mapWaypointIndices: function(waypoints, instructions, coordinates) {
			var wps = [],
				wpIndices = [],
				i,
				idx;

			wpIndices.push(0);
			wps.push(new L.Routing.Waypoint(coordinates[0], waypoints[0].name));

			for (i = 0; i < instructions.length; i++) {
				if (instructions[i].type === "WaypointReached") {
					idx = instructions[i].index;
					wpIndices.push(idx);
					wps.push({
						latLng: coordinates[idx],
						name: waypoints[wps.length + 1].name
					});
				}
			}

			wpIndices.push(coordinates.length - 1);
			wps.push({
				latLng: coordinates[coordinates.length - 1],
				name: waypoints[waypoints.length - 1].name
			});

			return {
				waypointIndices: wpIndices,
				waypoints: wps
			};
		}
	});

	L.Routing.tomTom = function(apiKey, options) {
		return new L.Routing.TomTom(apiKey, options);
	};

	module.exports = L.Routing.TomTom;
})();
