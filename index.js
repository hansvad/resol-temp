'use strict';

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var moment = require('moment');
var sprintf = require('sprintf').sprintf;

var vbus = require('resol-vbus');

var config = {
		configVersion : 2,
		host : '192.168.1.17',
		port : 7053,
		password : 'vbus',
		logInterval : 1,
		textLogDirectory : '.',
		textLogFilePattern : 'YYYYMMDD[.csv]',
		textLogColumSeparator : '\t',
		textLogLineSeparator : '\n',
		textLogSeparateDateAndTime : false,
		filter : '{}'

	};

var state = {
	appVersion : '1.0',
	resolVBusVersion : vbus.VERSION,
	connectionState : vbus.TcpConnection.STATE_DISCONNECTED,
	packetCount : 0,
	uniquePacketCount : 0,
	lastFilePath : null,
};

var vbusApp = vbus.extend(EventEmitter, {
	config : config,
	state : state,
	connection : null,
	headerSetConsolidator : null,
	spec : null,
	textConverter : null,
	constructor : function() {
		var _this = this;

		EventEmitter.call(this);
		this.headerSetConsolidator = new vbus.HeaderSetConsolidator({
			interval : config.logInterval * 10
		});

		this.headerSetConsolidator.on('headerSet', function(headerSet) {
			if (state.connectionState === vbus.TcpConnection.STATE_CONNECTED) {
				if (_this.textConverter) {
					_this.textConverter.convertHeaderSet(headerSet);
				}
			}
		});

		this.headerSetConsolidator.startTimer();

		this.textConverter = new vbus.TextConverter({
			columnSeparator : config.textLogColumSeparator,
			lineSeparator : config.textLogLineSeparator,
			separateDateAndTime : config.textLogSeparateDateAndTime,
			specification : null
		});

		this.textConverter.on('data', function(chunk) {
			var now = _this.headerSetConsolidator.lastIntervalTime;
			var filename = moment(now).format(config.textLogFilePattern);
			var fullPath = path.join(config.textLogDirectory, filename);
			console.log(chunk + " ");
			fs.appendFile(fullPath, chunk, function(err) {
				if (err) {
					console.log(err);
				} else {
					state.lastFilePath = fullPath;
				}
			});
		});

		try {
			this.applyFilter(config.filter);
		} catch (ex) {
			console.log(ex);

			this.applyFilter(null);
		}
	},

	connect : function() {
		var _this = this;

		this.connection = new vbus.TcpConnection({
			host : config.host,
			port : config.port,
			password : config.password,
		});

		this.connection.on('connectionState', function() {
			_this._onConnectionState();
		});

		this.connection.on('packet', function(packet) {
			_this._onPacket(packet);
		});

		this.connection.connect();

		this.headerSetConsolidator.interval = config.logInterval * 100;
	},

	disconnect : function() {
		if (this.connection) {
			this.connection.disconnect();
		}
	},

	_onConnectionState : function() {
		if (this.connection) {
			state.connectionState = this.connection.connectionState;
		} else {
			state.connectionState = vbus.TcpConnection.STATE_DISCONNECTED;
		}

		if (state.connectionState === vbus.TcpConnection.STATE_DISCONNECTED) {
			this.connection.removeAllListeners();

			this.connection = null;
		}

		this.emit('connectionState');
	},

	_onPacket : function(packet) {
		state.packetCount++;
		this.headerSetConsolidator.addHeader(packet);

		var headers = this.headerSetConsolidator.getSortedHeaders();
		var packetFieldSpecs = this.spec.getPacketFieldsForHeaders(headers);
		

	},

	applyFilter : function(specificationDataText) {
		var specificationData = JSON.parse(specificationDataText || '{}');
		this.spec = new vbus.Specification({
			language : config.language,
			specificationData : specificationData
		});
		this.headerSetConsolidator.removeAllHeaders();
		this.textConverter.specification = this.spec;
		this.textConverter.reset();
	},

});

var app= new vbusApp();
app.connect();
