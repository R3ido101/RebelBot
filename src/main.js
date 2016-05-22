import beamlib from "./beamlib.js";
import config from "./config.json";
import {
	logInfo,
	logError
} from "./logger.js";

var channelID;

var beamclient = new beamlib(config.username, config.password, (err, res) => {
	if (err || res == false) {
		logError("beamclient", err);
	} else {
		logInfo("beamclient", "Auth Worked!");
	}

	beamclient.getChannelID(config.channel, (err, res) => {
		if (err) {
			logError("beamclient", err);
		} else {
			channelID = res;
			logInfo("getChannelID", res);
		}

		beamclient.getUserID(config.username, (err, res) => {
			if (err) {
				logError("beamclient", err);
			} else {
				beamclient.joinChat(channelID, res, (err, res) => {
					if (err) {
						logError("chat", err)
					} else {
						logInfo("chats", "connected!");
					}
				});
			}
		});
	});
});
