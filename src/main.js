import beamsocket from "./beamsocket.js";
import config from "./config.json";

var channelID;

var doge = new beamsocket(config.username, config.password, (err, res) => {
	if (err) {
		console.log(err);
	}
	console.log(res);
});

doge.getChanID("ripbandit", function(res) {
	if (res == null) {
		console.log("error");
	}
	console.log(res);
	channelID = res;

	doge.getAuthKey(channelID);
});
