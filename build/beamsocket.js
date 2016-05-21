"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ws = require("ws");

var _ws2 = _interopRequireDefault(_ws);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var beamsocket = function () {
	function beamsocket(username, password, cb) {
		_classCallCheck(this, beamsocket);

		var _this = this;
		this.apiUrl = "https://beam.pro/api/v1/";
		this.servers = [];
		(0, _request2.default)({
			method: "POST",
			uri: _this.apiUrl + "users/login",
			form: {
				username: username,
				password: password
			},
			jar: true,
			json: true
		}, function (err, res, body) {
			if (err) {
				cb(err, null);
			}
			cb(null, body);
		});
	}

	_createClass(beamsocket, [{
		key: "getChanID",
		value: function getChanID(channel, cb) {
			(0, _request2.default)({
				method: "GET",
				uri: this.apiUrl + "channels/" + channel,
				json: true
			}, function (err, res, body) {
				if (err) {
					cb(null);
				}
				cb(body.id);
			});
		}
	}, {
		key: "getAuthKey",
		value: function getAuthKey(channel) {
			var _this2 = this;

			var _this = this;
			(0, _request2.default)({
				method: "GET",
				uri: this.apiUrl + "chats/" + channel,
				jar: true,
				json: true
			}, function (err, res, body) {
				var serveList = body.endpoints;
				_this2.authkey = body.authkey;

				(0, _lodash2.default)(serveList).forEach(function (server) {
					_this.servers.push(server);
				});
				// serveList.forEach(function(server) {
				// 	_this.servers.push(server);
				// });
			});
		}
	}, {
		key: "joinChat",
		value: function joinChat(cb) {
			var _this = this;
			if (this.servers[0] == undefined || this.servers[0] == null) {
				cb("No chat servers found!", null);
			}
		}
	}]);

	return beamsocket;
}();

exports.default = beamsocket;