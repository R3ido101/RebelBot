/*
Copyright 2015 Ripbandit, LLC.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var request = require("request");
var BeamSocket = require("./beam/ws");
var promise = require("bluebird");
var _ = require("lodash");
var sqlite3 = require("sqlite3").verbose();
var urban = require("./apis/urban");
var config = require("./config.js");

var auth = null;
var endpoints = null;
var apiUrl = "https://beam.pro/api/v1";
var socket = null;

// Modifying a object you don't own is bad, but I did it anyway.
String.prototype.has = function(str) {
    if (this.indexOf(str) != -1) {
        return true;
    } else {
        return false;
    }
};

/**
 * Constructor for the module
 * @param {Number} cID      ChannelID of the channel you want to join.
 * @param {Number} uID      UserID of the bot.
 * @param {String} username Username of the bot.
 * @param {String} password Password of the bot.
 */
function Rebelbot(cID, uID, username, password) {
    this.cID = cID;
    this.uID = uID;
    this.username = username;
    this.password = password;
    this.beamsocket = null;
    this.db = new sqlite3.Database("./db.sqlite3");
    this.lastMsg;
}

/** Logs the bot into chat. */
Rebelbot.prototype.login = function () {
    var self = this;
    request({
        method: "POST",
        uri: apiUrl + "/users/login",
        form: {
            username: self.username,
            password: self.password
        },
        jar: true
    },
    function (err, res, body) {
        if(!err) {
            request({
                method: "GET",
                uri: apiUrl + "/chats/" + self.cID,
                jar: true
            },
            function(err, res, body) {
                var chatData = JSON.parse(body);
                auth = chatData.authkey;

                if (endpoints == null) {
                    endpoints = chatData.endpoints;

                    socket = new BeamSocket(endpoints).boot();
                    socket.call('auth', [self.cID, self.uID, auth]).then(function() {
                        console.log("[login]: now authed!");
                    }).catch(function (err){
                        console.log("[ERROR] [login]: NOT AUTHED!!");
                    });

                    self.beamsocket = socket;

                    if (config.bot.enablePoints) {
                        socket.on("UserJoin", function(data){
                            self.addUserDB(data.username, function(success){
                                if (success == false) {
                                    self.Log("UserJoin", "User " + data.username + " is either already in the DB or there was an error!", true);
                                } else {
                                    self.Log("UserJoin", "User " + data.username + " added to the DB.");
                                }
                            });
                        });
                    }

                    socket.on("ChatMessage", function (data){
                        var text = "";
                        var roles = data.user_roles;
                        var bName = data.user_name;

                        _.forEach(data.message.message, function (component){
                            switch(component.type) {
                                case 'text':
                                    text += component.data;
                                    break;
                                case 'emoticon':
                                    text += component.text;
                                    break;
                                case 'link':
                                    text += component.text;
                                    if (!config.bot.enableLinks && !self.isMod(roles) || !self.isReg(bName)) {
                                        self.delMessage(data.id, data.user_name);
                                    }
                                    break;
                            }
                        });

                        if (data.user_name == self.username) {
                            self.lastMsg == data;
                        }

                        if(text.indexOf("!") == 0) {
                            if(text.indexOf("!urban") == 0 && self.isMod(roles)) {
                                var urText = text.replace("!urban ", "");
                                var urC = new urban.Client();
                                urC.getTerm({ term: urText }, function (err, def) {
                                    if (err) {
                                        self.Log("!urban", err, true);
                                    } else {
                                        self.sendMsg(def);
                                    }
                                });
                            }

                            if (text.indexOf("!ping") == 0) {
                                var dateTime = new Date();
                                self.sendMsg("pong sent at: " + dateTime);
                            }

                            if (text.indexOf("!addcom") == 0 && self.isMod(roles)) {
                                var cText = text.replace('!addcom ', '');
                                var spltText = cText.split(' ');
                                var tiText = spltText.shift();
                                var comText = spltText.toString();
                                var allTheText = comText.replace(/,/g, ' ');

                                if (tiText.indexOf("!") == 0) {
                                    self.addCom(self.cID, tiText, allTheText);
                                } else {
                                    var tiText2 = "!" + tiText;
                                    self.addCom(self.cID, tiText2, allTheText);
                                }
                                self.Log("!addcom", "TEST " + tiText, false);
                                self.Log("!addcom", "TEST " + allTheText, false);
                            }

                            if (text.indexOf("!delcom") == 0 && self.isMod(roles)) {
                                var dText = text.replace('!delcom ', '');
                                var dSpltText = dText.split(' ');
                                var dTiText = dSpltText.shift();
                                var dComText = dSpltText.toString();
                                var dAllTheText = dComText.replace(/,/g, ' ');

                                self.delCom(self.cID, dText);
                            }

                            if (text.indexOf("!addquote") == 0 && self.isMod(roles)) {
                                var qaText = text.replace('!addquote ', '');
                                var qaSpltText = qaText.split(' ');
                                var qaTiText = qaSpltText.shift();
                                var qaComText = qaSpltText.toString();
                                var qaAllTheText = qaComText.replace(/,/g, ' ');

                                console.log(qaTiText);

                                self.addQuote(self.cID, qaTiText);
                            }

                            if (text.indexOf("!delquote") == 0 && self.isMod(roles)) {
                                var qdText = text.replace('!delquote ', '');
                                var qdSpltText = qdText.split(' ');
                                var qdTiText = qdSpltText.shift();
                                var qdComText = qdSpltText.toString();
                                var qdAllTheText = qdComText.replace(/,/g, ' ');

                                self.delQuote(self.cID, qdAllTheText);
                            }

                            if (text.indexOf("!quote") == 0) {
                                var qText = text.replace('!quote ', '');
                                var qSpltText = qText.split(' ');
                                var qTiText = qSpltText.shift();
                                var qComText = qSpltText.toString();
                                var qAllTheText = qComText.replace(/,/g, ' ');

                                console.log(qText);
                                self.db.get("SELECT res FROM quotes WHERE ID = ? AND chan = ?", [qText, self.cID], function(err, row){
                                    if (err) {
                                        log("!quote", err, true);
                                        self.sendMsg("There was an error getting that quote: " + err);
                                    } else {
                                        self.sendMsg(row.res);
                                    }
                                });
                                // self.db.get("SELECT res FROM quotes WHERE ID = ? AND chan = ?", [qText, self.cID], function(err, row){
                                //     if(err){
                                //         log("!quote", err, true);
                                //         self.sendMsg("There was ann error getting that quote");
                                //     } else {
                                //         self.sendMsg(row.res);
                                //     }
                                // });
                            }

                            if (text.indexOf("!ban") == 0 && self.isMod(roles)) {
                                var banText = text.replace("!ban ", "");
                                self.banUser(banText);
                            }

                            if(text.indexOf("!bug") == 0 && self.isMod(roles)) {
                                self.sendMsg("You can submit bug reports at https://github.com/ripbandit/RebelBot/issues or tweet @Ripbandit_ with them!");
                            }

                            if(text.indexOf("!addpoints") == 0 && self.isMod(roles)) {
                                var pText = text.replace("!addpoints", "");
                                var pNText = pText.split(" ");
                                self.setPoints(pNText[1], pNText[2], function(err){
                                    if (err != null) {
                                        self.sendMsg("Couldn't add points to user, error: " + err);
                                    } else {
                                        self.sendMsg("Added " + pNText[2] + " point(s) to " + pNText[1] + "!");
                                    }
                                });
                            }

                            if(text.indexOf("!points") == 0) {
                                var pSpltText = text.split(" ");
                                if (pSpltText.length == 1) {
                                    self.getPoints(bName, function(err, res){
                                        if (err) {
                                            throw err;
                                        } else {
                                            self.sendMsg("You have " + res + " points!");
                                        }
                                    });
                                } else if (pSpltText.length == 2) {
                                    self.getPoints(pSpltText[1], function(err, res){
                                        if (err) {
                                            throw err;
                                        } else {
                                            self.sendMsg(pSpltText[1] + " has " + res + " points!");
                                        }
                                    });
                                }
                            }

                            if(text.indexOf("!regular") == 0 && self.isMod(roles)) {
                                var rText = text.replace("!regular ", "");
                                console.log(rText);
                                self.setRegular(rText, 1, function(err){
                                    if (err) {
                                        self.sendMsg("Couldn't set user to regular error: " + err);
                                    } else {
                                        self.sendMsg("Set " + rText + " to regular!");
                                    }
                                });
                            }

                            if (text.indexOf("!addcom") != 0 && text.indexOf("!urban") != 0 && text.indexOf("!addquote") != 0 && text.indexOf("!quote") != 0 && text.indexOf("!delcom") != 0 && text.indexOf("!delquote") != 0 &&
                            text.indexOf("!ping") != 0 && text.indexOf("!ban") != 0 && text.indexOf("!bug") != 0 && text.indexOf("!addpoints") != 0 && text.indexOf("!regular") != 0 && text.indexOf("!points") !=0) {
                                try {
                                    self.getCom(self.cID, text, function(err, res){
                                        if (err) {
                                            throw err;
                                        }
                                        if (res.has("{USERNAME}")) {
                                            self.sendMsg(res.replace("{USERNAME}", self.data.user_name));
                                        } else {
                                            self.sendMsg(res);
                                        }
                                    });
                                } catch(ex) {
                                    throw ex;
                                }
                            }
                        }
                    });
                }
            });
        }
    });
};

/**
 * Logs bot out of chat.
 */
Rebelbot.prototype.logout = function () {
    if (this.beamsocket != null) {
        this.beamsocket.close();
    } else {
        console.log("bot not started yet!");
    }
};

/**
 * Function for logging stuff to the console, makes life easier.
 * @param {String}  funcName Name of the function the log originates from.
 * @param {String}  logStr   What you want to log.
 * @param {Boolean} isError  Is this an error message?
 */
Rebelbot.prototype.Log = function (funcName, logStr, isError) {
    if (isError == true) {
        console.log("[ERROR] [" + funcName + "]: " + logStr);
    } else {
        console.log("[" + funcName + "]: " + logStr);
    }
};

/**
 * Sends a message to the channel
 * @param  {String} msg Message
 */
Rebelbot.prototype.sendMsg = function (msg) {
    var self = this;
    if (this.beamsocket == null) {
        self.Log("sendMsg", "Bot not logged in!", true);
    } else {
        this.beamsocket.call("msg", [msg]).then(function(){
            self.Log("sendMsg", msg, false);
        });
    }
};

/**
 * Adds a command to the Database.
 * @param {Number} chanID ChannelID of the channel you want to add a command to.
 * @param {String} com    Command name.
 * @param {String} res    Command response.
 */
Rebelbot.prototype.addCom = function (chanID, com, res) {
    var self = this;
    this.db.run("INSERT INTO command VALUES(?, ?, ?)", [chanID, com, res], function (err){
        self.sendMsg("Command " + com + " added!");
    });
    // this.db.serialize(function () {
    //     self.db.run("INSERT INTO 'commands' VALUES(?, ?, ?)", [chanID, com,res], function (err){
    //         self.sendMsg("Command " + com + " added!");
    //     });
    // });
};

/**
 * Deletes a command from the Database
 * @param  {String} chanID ChannelID of the channel you want to remove a command from.
 * @param  {String} com    Command name.
 */
Rebelbot.prototype.delCom = function (chanID, com) {
    var self = this;
    self.db.run("DELETE FROM 'commands' WHERE chanid = ? AND name = ?", [chanID, com], function (err, row) {
        self.sendMsg("Command " + com + " deleted!");
    });
};

/**
 * Get command from the Database.
 * @param  {Number} chanID ChannelID to get the command from.
 * @param  {String} com Command Name
 */
Rebelbot.prototype.getCom = function (chanID, com, cb) {
    var self = this;
    console.log(com);
    try {
        this.db.get("SELECT response FROM commands WHERE chanID = ? AND name = ?", [chanID, com], function(err, row){
            if (err) {
                throw err;
                cb(err, msgString);
            }
            console.log(row);
            var msgString = row.response;
            cb(null, msgString);
        });
    } catch (exception) {
        throw exception;
    }
}

/**
 * Adds quote to the Database.
 * @param {Number} chanID ChannelID to add the Quote to.
 * @param {String} txt    Quote text.
 */
Rebelbot.prototype.addQuote = function (chanID, txt) {
    var self = this;
    self.db.run("INSERT INTO 'quotes' VALUES(null, ?, ?)", [txt, chanID], function (err) {
        self.sendMsg("Quote added with ID of " + this.lastID);
    });
};

/**
 * Deletes a Quote from the Database.
 * @param  {Number} chanID ChannelID to remove the quote from.
 * @param  {Number} qID    QuoteID to remove.
 */
Rebelbot.prototype.delQuote = function (chanID, qID) {
    var self = this;
    self.db.run("DELETE FROM 'quotes' WHERE ID = ? AND chan = ?", [qID, chanID], function (err){
        self.sendMsg("Quote " + qID + " deleted!");
    });
}

/**
 * Checks if a user is a mod or higher.
 * @param  {Array}  ranks [description]
 * @return {Boolean}       If user is a mod or higher it returns true, else is false.
 */
Rebelbot.prototype.isMod = function (ranks) {
    if (ranks.indexOf("Mod") >= 0 || ranks.indexOf("Owner") >= 0) {
        return true;
    } else {
        return false;
    }
}

/**
 * Checks if a user is a regular
 * @param  {String} username Username of the user.
 * @return {Boolean}         True if user is a regular false if anything else.
 */
Rebelbot.prototype.isReg = function(username) {
    var self = this;
    self.db.run("SELECT regular FROM user WHERE username = ?", [username], function(err, row){
        if (row == 1) {
            return true;
        } else {
            return false;
        }
    })
}

/**
 * Checks whether the bot is online or not.
 * @return {Boolean} True if the bot is online, false if else.
 */
Rebelbot.prototype.isUp = function() {
    if (this.beamsocket != null && this.beamsocket.status == BeamSocket.CONNECTED) {
        return true;
    } else {
        return false;
    }
}

/**
 * Bans a user from the chat.
 * @param  {String} user Username of the user you wanna ban.
 */
Rebelbot.prototype.banUser = function(user) {
    var self = this;
    request({
        method: "PATCH",
        uri: apiUrl + "/channels/" + self.cID + "/users/" + user,
        json: true,
        body: {
            add: ["Banned"]
        },
        jar: true
    }, function(err, res, body){
        if (err || res.statusCode == 400 || res.statusCode == 403 || res.statusCode == 404) {
            self.Log("banUser", "Error banning user " + user, true);
        } else {
            self.sendMsg("@" + user + " has been banned!");
        }
    });
}

/**
 * Deletes a Message from chat.
 * @param  {String} uuid UUID of the message.
 * @param  {String} user Username of the user who's message is being removed.
 */
Rebelbot.prototype.delMessage = function(uuid, user) {
    var self = this;
    request({
        method: "DELETE",
        uri: apiUrl + "/chats/" + self.cID + "/message/" + uuid,
        jar: true
    }, function(err, res, body){
        console.log(res);
        if (err || res.statusCode == 403 || res.statusCode == 404) {
            self.Log("delMessage", "error deleting message " + uuid, true);
        } else {
            self.sendMsg("@" + user + " Message deleted!");
        }
    });
}

/**
 * Checks whether the db has something in it or not.
 * @param  {String} table Table you want to check.
 * @param  {String} field Field of the table you wanna check.
 * @param  {String} key   What you want to to find.
 * @return {Boolean}      If the DB has that key it returns true, else is false.
 */
Rebelbot.prototype.dbHas = function(table, field, key) {
    var self = this;
    self.db.get("SELECT ? FROM ? WHERE ? = ?", [field, table, key], function(err, row){
        if (err || row == undefined) {
            return false;
        } else {
            return true;
        }
    });
}

/**
 * Adds a user to the Database
 * @param  {String}   username Username of the user you want to add.
 * @param  {Function} cb       Callback that returns false if there is an error and true if else.
 */
Rebelbot.prototype.addUserDB = function(username, cb) {
	var self = this;
	if (!self.dbHas("user", "username", username) && username != config.beam.user) {
		self.db.run("INSERT INTO user VALUES(?, 0, 0)", [username], function(err, row){
			if (err) {
				cb(err);
			} else {
                cb(null);
            }
		});
	}
}

/**
 * Adds points to a user.
 * @param  {String}   username Username of the user.
 * @param  {Number}   points   Number of points to add to the user.
 * @param  {Function} cb       Callback, returns the error if there is one, returns null if there isn't.
 */
Rebelbot.prototype.setPoints = function(username, points, cb) {
    var self = this;
    self.db.run("UPDATE user SET points = ? WHERE username = ?", [points, username], function(err, row){
        if (err) {
            cb(err);
        } else {
            cb(null);
        }
    });
}

/*
    TODO: Document these functions once complete.
 */


/**
 * Sets a users regular status
 * @param  {String}   username username of the user.
 * @param  {Number}   lvl      level to set user to, 1 for regular 0 for normal user.
 * @param  {Function} cb       [description]
 */
Rebelbot.prototype.setRegular = function(username, lvl, cb) {
    var self = this;
    self.db.run("UPDATE user SET regular = ? WHERE username = ?", [lvl, username], function(err, row){
        if (err) {
            cb(err);
        } else {
            cb(null);
        }
    });
}

/**
 * Checks if the user is live.
 * @return {Boolean} returns true if online, false if not.
 */
Rebelbot.prototype.isLive = function() {
    request({
        method: "GET",
        uri: apiUrl + "/channels/" + this.cID,
        jar: true
    },
    function(err, res, body) {
        body = JSON.parse(body);
        if (body.online == true) {
            return true;
        } else {
            return false;
        }
    });
}


/**
 * Add points to user.(Might change.)
 * @param  {String}   username Username of user you want to modify.
 * @param  {Number}   amount   Amount of points to add.
 * @param  {Function} cb       [description]
 * @return {[type]}            [description]
 */
Rebelbot.prototype.addPoints = function(username, amount, cb) {
    var self = this;
    self.db.get("SELECT points FROM user WHERE username = ?", [username], function(err, row) {
            amount = row.points + amount;
            if (err) {
                cb(err, null);
            } else {
                cb(null, null);
            }
        self.db.run("UPDATE user SET points = ? WHERE username = ?", [amount, username], function(err, row){
            if (err) {
                cb(null, err);
            } else {
                cb(null, null);
            }
        });
    });

}

/**
 * Get points of user.
 * @param  {String}   username username to get points of.
 * @param  {Function} cb       Callback to recieve data or error.
 * @return {Object, Number}            Object is the error object, null if no error. Number is the amount of points the player has.
 */
Rebelbot.prototype.getPoints = function(username, cb) {
    this.db.get("SELECT points FROM user WHERE username = ?", [username], function(err, row){
        if (err) {
            cb(err, null);
        } else {
            cb(null, row.points);
        }
    });
}

exports.Rebelbot = Rebelbot;
