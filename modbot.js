/*
Copyright 2016 Ripbandit, LLC.

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
    this.defaultCommands = ["!test", "!addcom", "!delcom", "!urban", "!ping", "!ban", "!bug", "!quote", "!addquote", "!delquote"];
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

                        var spltText = text.split(" ");

                        var msgCom = spltText[0];

                        switch(msgCom) {
                            case "!test":
                                self.sendMsg("Test command works!");
                                break;
                            case "!addcom":
                                var _sliceArr = spltText.slice(2);
                                var _sliceStr = _sliceArr.toString();
                                var _resText = _sliceStr.replace(/,/g, " ");
                                if (self.isMod(roles)) {
                                    if (spltText[1].indexOf("!") == 0) {
                                      console.log(_resText);
                                      self.addCom(config.beam.chanID, spltText[1], _resText, function(err, added, com) {
                                        if (err) {
                                          console.log(err);
                                        } else {
                                          self.sendMsg("Command " + com + " added!");
                                        }
                                      });
                                    } else {
                                        var _comText = "!" + spltText[1];
                                        self.addCom(self.cID, _comText, _resText, function(err, added, com){
                                          if (err) {
                                            console.log(err);
                                          } else {
                                            self.sendMsg("Command " + com + " added!");
                                          }
                                        });
                                    }
                                } else {
                                    self.sendMsg(config.msgs.ModOnly);
                                }
                                break;
                            case "!delcom":
                                if (self.isMod(roles)) {
                                    if (spltText[1].indexOf("!") == 0) {
                                        self.delCom(self.cID, spltText[1], function(err, deleted, com){
                                          if (err) {
                                            console.log(err);
                                          } else {
                                            self.sendMsg("command " + com + " deleted!");
                                          }
                                        });
                                    } else {
                                        var _delComText = "!" + spltText[1];
                                        self.delCom(self.cID, _delComText, function(err, deleted, com) {
                                          if (err) {
                                            console.log(err);
                                          } else {
                                            self.sendMsg("command " + com + " deleted!");
                                          }
                                        });
                                    }
                                } else {
                                    self.sendMsg(config.msgs.ModOnly);
                                }
                                break;
                            case "!urban":
                                var urbanClient = new urban.Client();
                                urbanClient.getTerm({term: spltText[1]}, function(err, res){
                                    if (err) {
                                        self.Log("!urban", err, true);
                                    } else {
                                        self.sendMsg(def);
                                    }
                                });
                                break;
                            case "!ping":
                                var dateTime = new Date();
                                self.sendMsg(config.msgs.PongSent + dateTime);
                                break;
                            case "!addquote":
                                if (self.isMod(roles)) {
                                    self.addQuote(self.cID, spltText[1], function(err, lastID){
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            self.sendMsg("Quote added with ID of " + lastID);
                                        }
                                    });
                                } else {
                                    self.sendMsg(config.msgs.ModOnly);
                                }
                                break;
                            case "!delquote":
                                if (self.isMod(roles)) {
                                    self.delQuote(self.cID, spltText[1], function(err, stat, lastID){
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            self.sendMsg("Quote " + lastID + " deleted!");
                                        }
                                    });
                                } else {
                                    self.sendMsg(config.msgs.ModOnly);
                                }
                                break;
                            case "!quote":
                                self.getQuote(self.cID, 1, function (err, res){
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        self.sendMsg(res);
                                    }
                                });
                                break;
                            case "!ban":
                                self.sendMsg(config.msgs.NotImplemented);
                                break;
                            case "!bug":
                                self.sendMsg(config.msgs.NotImplemented);
                                break;
                        }

                        if (msgCom.indexOf("!") == 0 && self.isNotDefault(msgCom)) {
                            self.getCom(self.cID, msgCom, function(err, res){
                                if (err) {
                                    console.log(err);
                                } else {
                                    if (res.has("{USERNAME}")) {
                                        self.sendMsg(res.replace("{USERNAME}", self.data.user_name));
                                    } else {
                                        self.sendMsg(res);
                                    }
                                }
                            });
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

Rebelbot.prototype.sendWhisper = function (user, msg) {
    var self = this;
    if (this.beamsocket == null) {
        self.Log("sendWhisper", "bot not logged in!", true);
    } else {
        this.beamsocket.call("whisper", [user, msg]).then(function(){
            self.Log("sendWhisper", msg, false);
        })
    }
}


Rebelbot.prototype.addCom = function (chanID, com, res, cb) {
    var self = this;
    this.db.run("INSERT INTO commands VALUES(?, ?, ?)", [chanID, com, res], function (err) {
        if (err) {
            cb(err, false, null);
        } else {
            cb(null, true, com);
        }
    });
};

/**
 * Deletes a command from the Database
 * @param  {String} chanID ChannelID of the channel you want to remove a command from.
 * @param  {String} com    Command name.
 */
Rebelbot.prototype.delCom = function (chanID, com, cb) {
    var self = this;
    self.db.run("DELETE FROM 'commands' WHERE chanid = ? AND name = ?", [chanID, com], function (err, row) {
        // self.sendMsg("Command " + com + " deleted!");
        if (err) {
            cb(err, false, null);
        } else {
            cb(false, true, com);
        }
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
                cb(err, null);
            }
            console.log(row);
            var msgString = row.response;
            cb(null, msgString);
        });
    } catch (exception) {
        console.log(exception);
    }
}

/**
 * Adds quote to the Database.
 * @param {Number} chanID ChannelID to add the Quote to.
 * @param {String} txt    Quote text.
 */
Rebelbot.prototype.addQuote = function (chanID, txt, cb) {
    var self = this;
    self.db.run("INSERT INTO 'quotes' VALUES(null, ?, ?)", [txt, chanID], function (err) {
        // self.sendMsg("Quote added with ID of " + this.lastID);
        if (err) {
            cb(err, null);
        } else {
            cb(null, this.lastID);
        }
    });
};

Rebelbot.prototype.getQuote = function (chanID, qID, cb) {
    var self = this;
    console.log(qID);
    console.log(chanID);
    self.db.run("SELECT res FROM quotes WHERE ID = ? AND chan = ?", [qID, chanID],  function(err, row){
        if (err) {
            console.log(err);
        } else {
            console.log(row);
        }
    });
}

/**
 * Deletes a Quote from the Database.
 * @param  {Number} chanID ChannelID to remove the quote from.
 * @param  {Number} qID    QuoteID to remove.
 */
Rebelbot.prototype.delQuote = function (chanID, qID, cb) {
    var self = this;
    self.db.run("DELETE FROM 'quotes' WHERE ID = ? AND chan = ?", [qID, chanID], function (err){
        // self.sendMsg("Quote " + qID + " deleted!");
        if (err) {
            cb(err, false, null);
        } else {
            cb(null, true, qID);
        }
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

Rebelbot.prototype.isNotDefault = function (text) {
    var self = this;
    var defCommandsList = self.defaultCommands;
    if (defCommandsList.indexOf(text) != -1) {
        return false;
    } else {
        return true;
    }
}

exports.Rebelbot = Rebelbot;
