import ws from "ws";
import request from "request";
import _ from "lodash";

export default class beamsocket {
	constructor(username, password, cb) {
		var _this = this;
		this.apiUrl = "https://beam.pro/api/v1/";
		this.servers = [];
		this.ws = null;
		this.id = 0;

		request({
			method: "POST",
			uri: _this.apiUrl + "users/login",
			form: {
				username: username,
				password: password
			},
			jar: true,
			json: true
		}, (err, res, body) => {
			if (err) {
				cb(err, null);
			}
			cb(null, body);
		});
	}

	getChanID(channel, cb) {
		request({
			method: "GET",
			uri: this.apiUrl + "channels/" + channel,
			json: true
		}, (err, res, body) => {
			if (err) {
				cb(null);
			}
			cb(body.id);
		});
	}

	getAuthKey(channel) {
		var _this = this;
		request({
			method: "GET",
			uri: this.apiUrl + "chats/" + channel,
			jar: true,
			json: true
		}, (err, res, body) => {
			var serveList = body.endpoints;
			this.authkey = body.authkey;

			_(serveList).forEach(function(server) {
				_this.servers.push(server);
			});
			// serveList.forEach(function(server) {
			// 	_this.servers.push(server);
			// });
		});
	}

	joinChat(cb) {
		var _this = this;
		if (this.servers[0] == undefined || this.servers[0] == null) {
			cb("No chat servers found!", null);
		}
		if (this.ws != null) {
			cb("Already joined a chat server!", null);
		}

		var server = _.sample(this.servers);
		var wsc = new ws(server);

		ws.on("open", function() {
			sendAuth();
		})

		this.ws = wsc;
	}

	sendAuth(cID, uID, cb) {
		var authPacket = {
			type: "method",
			method: "auth",
			arguments: [
				cID,
				uID,
				this.authkey
			]
		}
	}

	sendPacket(method, args, options) {

	}
}
