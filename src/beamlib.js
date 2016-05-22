import beamsocket from "beam-client-node/lib/ws";
import _ from "lodash";
import request from "request";

export default class beamlib {
	constructor(username, password, cb) {
		this.apiUrl = "https://beam.pro/api/v1/";
		this.addresses = null;
		this.authKey = null;
		this.socket = null;

		request({
			method: "POST",
			uri: this.apiUrl + "users/login",
			form: {
				username: username,
				password: password
			},
			jar: true,
			json: true
		}, (err, res, body) => {
			if (err) {
				cb(err, false);
			} else {
				cb(null, true)
			}
		});
	}

	getChannelID(channel, cb) {
		request({
			method: "GET",
			uri: this.apiUrl + "channels/" + channel,
			json: true,
			jar: true
		}, (err, res, body) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, body.id);
			}
		});
	}

	getUserID(channel, cb) {
		request({
			method: "GET",
			uri: this.apiUrl + "channels/" + channel,
			json: true,
			jar: true
		}, (err, res, body) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, body.userId);
			}
		});
	}

	joinChat(cID, uID, cb) {
		this.getAuthKey(cID, (err) => {
			if (err) {
				cb(err, null);
			} else {
				this.connect(cID, uID, (err, res) => {
					if (err) {
						cb(err, null);
					} else {
						cb(null, true);
					}
				});
			}
		});
	}

	getAuthKey(cID, cb) {
		request({
			method: "GET",
			uri: this.apiUrl + "chats/" + cID,
			json: true,
			jar: true
		}, (err, res, body) => {
			if (err) {
				cb(err);
			} else {
				this.addresses = body.endpoints;
				this.authKey = body.authkey;
				cb(null);
			}
		});
	}

	connect(cID, uID, cb) {
		this.socket = new beamsocket(this.addresses).boot();
		var socket = this.socket;

		socket.auth(cID, uID, this.authKey)
			.then(() => {
				cb(null, true);
			}).catch((err) => {
				cb(err, null);
			});
	}
}
