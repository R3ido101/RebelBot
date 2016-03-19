var config = {};
// DO NOT TOUCH
config.beam = {};
// DO NOT TOUCH
config.web = {};

// beam username of bot
config.beam.user = "botusernamehere";
// beam password of bot
config.beam.pass = "botpasswordhere"
// chatID you want to join
config.beam.chatID = "ID of chat you want to join";
// Beam User ID of bot
config.beam.userID = "user id of bot";
// Currently unused!
config.beam.clientID = "Oauth client ID";
config.beam.secret = "Oauth secret";

// port number of bot(If you don't know what this is, leave it.)
config.web.port = 51305;
// Do you want to send changes made in the WebUI to chat?
config.web.sendChange = true;
// IP of bot(If you don't know what this is, leave it.)
config.web.IP = "0.0.0.0";

// Whether points are enabled or not, not fully implemented
config.bot.enablePoints = true;
// Enable points being added every X minutes/seconds/hours.
config.bot.enableAutoPoints = true;
// Inteval for autoPoints in milliseconds, does nothing if enableAutoPoints is disabled.
config.bot.autoPointInt = 60000;
// Amount of points added every time autoPointInt passes.
config.bot.autoPointAmnt = 10;
// Whether or not the bot allows links.
config.bot.enableLinks = false;

// DO NOT TOUCH
module.exports = config;
