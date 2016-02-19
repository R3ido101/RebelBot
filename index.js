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


var express = require("express");
var bot = require("./modbot");
var _ = require("lodash");
var sqlite3 = require("sqlite3").verbose();
var bodyParser = require("body-parser");
var request = require("request");
var config = require("./config");

var channelID = config.beam.chatID;
var port = config.web.port;
var ip = config.web.IP;
var Rebelbot = new bot.Rebelbot(channelID, config.beam.userID, config.beam.user, config.beam.pass);
var db = new sqlite3.Database("./db.sqlite3");
var app = express();
var users = [];
var pointsTimer = setInterval(function() {
    addUsers()
},
config.bot.autoPointInt);

app.set("view engine", "ejs");

app.locals._ = _;
app.locals.db = db;
app.locals.chanID = channelID;

app.use(express.static("static"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/*
    WIP auto points thing, doesn't currently work even though it did before.
 */
function addUsers() {
    request({
        method: "GET",
        uri: "https://beam.pro/api/v1/chats/" + channelID + "/users",
        jar: true
    },
    function(err, res, body){
        body = JSON.parse(body);
        console.log(body);
        body.forEach(function(value, index, ar){
            var username = value.userName;
            if (!Rebelbot.dbHas("user", "username", username)) {
                Rebelbot.addUserDB(username, function (err){
                    if (err) {
                        console.log("there was an error");
                    }
                });
            }
            users.push(username);
        });
        autoAddPoints(users, config.bot.autoPointAmnt);
    });
}

function autoAddPoints(userList, points) {
    console.log("Called autoAddPoints");
    userList.forEach(function(value, index, ar) {
        var curUser = userList[index];
        console.log(curUser);
        Rebelbot.addPoints(curUser, points, function(err, err2){
            if (err) {
                console.log(err);
            } else if (err2) {
                console.log(err2);
            }
        });
    });
}

addUsers();


// Private API, don't use unless modifying web app.
app.post("/papi/quotes/delete/:id", function(req, res){
    var quote = req.params.id;
    console.log(quote);
    db.run("DELETE FROM quotes WHERE id = ? AND chan = ?", [quote, channelID], function(err, row){
        if (err) {
            res.status(500).send("Unexpected error occured, check console if you are the bot host/admin!");
        } else {
            res.status(200).json({
                quoteID: quote,
                deleted: true
            });
        }
    });
});

app.post("/papi/commands/add", function(req, res){
    var comName;
    if (req.body.name.indexOf("!") == 0) {
        comName = req.body.name;
    } else {
        comName = "!" + req.body.name;
    }
    db.run("INSERT INTO commands VALUES(?, ?, ?)", [channelID, comName, req.body.response], function(err, row){
        console.log("Command " + comName + " added!");
        if (config.web.sendChange == true) {
            Rebelbot.sendMsg("Command " + comName + " added from webUI!");
        }
        res.redirect("/commands");
    });
});

app.post("/papi/commands/delete/:name", function(req, res){
    var com = req.params.name;
    console.log(com);
    db.run("DELETE FROM commands WHERE chanID = ? AND name = ?", [channelID, com], function(err, row){
        res.redirect("/commands");
        if (config.web.sendChange == true) {
            Rebelbot.sendMsg("Command " + com + " deleted from webUI");
        }
    });
});

app.get("/papi/start", function(req, res, next){
    Rebelbot.login();
    res.redirect("/");
})

app.get("/papi/stop", function(req, res, next){
    Rebelbot.logout();
    res.redirect("/");
});

app.post("/papi/points/add", function(req, res){
    var username = req.body.username;
    var points = req.body.points;
    Rebelbot.addPoints(username, points, function (err, err2){
        res.redirect("/users");
    });
});

// Public API, feel free to use this in your apps!
app.get("/api/quotes/list", function (req, res) {
    db.all("SELECT * FROM quotes WHERE chan = ?", [channelID], function (err, row) {
        if (err) {
            res.status(500).json({
                status: 500,
                text: "internal server error."
            });
        } else {
            res.status(200).json({
                status: 200,
                quotes: row
            });
        }
    });
});

app.post("/api/quotes/add", function(req, res){
    db.run("INSERT INTO quotes VALUES(null, ?, ?)", [channelID, req.body.qText], function(err, row){
        var _self = this;
        if (err) {
            res.status(500).json({
                status: 500,
                text: "Interal server error."
            });
            console.log(err);
        } else {
            res.status(200).json({
                status: 200,
                quoteID: _self.lastID,
            });
        }
    });
});

app.delete("/api/quotes/delete/:id", function(req, res){
    var quote = req.params.id;
    db.run("DELETE FROM quotes WHERE id = ? AND chan = ?", [quote, channelID], function(err, row){
        if (err) {
            res.status(404).json({
                status: 404,
                text: "Quote not found!"
            });
        } else {
            res.status(200).json({
                status: 200,
                quoteID: quote,
                deleted: true
            });
        }
    });
});

app.get("/api/commands/list", function (req, res) {
    db.all("SELECT * FROM commands WHERE chanID = ?", [channelID], function (err, row) {
        if (err) {
            res.status(500).json({
                status: 500,
                text: "internal server error."
            });
        } else {
            res.status(200).json({
                status: 200,
                commands: row
            });
        }
    });
});

app.post("/api/commands/add", function(req, res){
    var comName;
    if (req.body.name.indexOf("!") == 0) {
        comName = req.body.name;
    } else {
        comName = "!" + req.body.name;
    }
    db.run("INSERT INTO commands VALUES(?, ?, ?)", [channelID, comName, req.body.response], function(err, row){
        if (err) {
            res.status(500).json({
                status: 500,
                text: "Internal server error."
            });
        } else {
            res.status(200).json({
                status: 200,
                comName: comName,
                response: req.body.response
            });
        }
    });
});

app.delete("/api/commands/remove/:name", function (req, res) {
    var comName = req.params.name;
    db.run("DELETE FROM commands WHERE chanID = ? AND name = ?", [channelID, comName], function (err, row) {
        if (err) {
            res.status(404).json({
                status: 404,
                text: "Command not found!"
            });
        } else {
            res.status(200).json({
                status: 200,
                quoteID: quote,
                deleted: true
            });
        }
    });
});

app.post("/api/points/add", function (req, res) {
    var username = req.body.username;
    var points = req.body.points;
    Rebelbot.addPoints(username, points, function(err, err2) {
        if (err) {
            res.status(500).json({
                status: 500,
                text: "database error " + err
            });
        } else if (err2) {
            res.status(500).json({
                status: 500,
                text: "Database error " + err
            });
        } else {
            res.status(200).json({
                status: 200,
                text: "Points successfully added!"
            });
        }
    });
});

app.get("/quotes", function(req, res, next){
    db.all("SELECT * from quotes where chan = ?", [channelID], function (err, row){
        console.log(row);
        res.render("quotes", {quotes: row});
    });
});

app.get("/commands", function(req, res, next){
    // db.run("SELECT * FROM commands WHERE chanID = ?", [channelID], function(err, row){
    //     if (err) {
    //         console.log(err);
    //         res.json({
    //             dbStuff: row
    //         });
    //     } else {
    //         console.log(row);
    //         res.json({
    //             dbStuff: row
    //         });
    //     }
    // });

    // db.run("SELECT * FROM commands WHERE chanID = ?", [channelID], function(err, row){
    //     console.log(row);
    //     // res.render("commands", {commands: row});
    //     res.json({
    //         dbStuff: row
    //     });
    // });

    db.all("SELECT * FROM commands WHERE chanID = ?", [channelID], function(err, row){
        res.render("commands", {commands: row});
    });
});

app.get("/users", function(req, res, next){
    db.all("SELECT * FROM users", function (err, row) {
        console.log(row);
        res.render("users", {users: row});
    });
});

app.get("/", function(req, res, next) {
    res.render("home", {isUp: Rebelbot.isUp()});
});

app.listen(port, ip, function() {
    console.log("Web server up at: " + ip + ":" + port);
});
