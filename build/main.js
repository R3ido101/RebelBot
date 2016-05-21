"use strict";

var _beamsocket = require("./beamsocket.js");

var _beamsocket2 = _interopRequireDefault(_beamsocket);

var _config = require("./config.json");

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var channelID;

var doge = new _beamsocket2.default(_config2.default.username, _config2.default.password, function (err, res) {
	if (err) {
		console.log(err);
	}
	console.log(res);
});

doge.getChanID("ripbandit", function (res) {
	if (res == null) {
		console.log("error");
	}
	console.log(res);
	channelID = res;

	doge.getAuthKey(channelID);
});