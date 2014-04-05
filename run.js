var EventEmitter = require('events').EventEmitter;
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