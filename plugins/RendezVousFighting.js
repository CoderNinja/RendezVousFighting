var mysql = require('mysql');
var mySqlConfig = require('../../config/config.mysql.js');
var db;
var _this;

function dbConnect() {
    db = mysql.createConnection(mySqlConfig); // Recreate the connection, since
                                                    // the old one cannot be reused.

    db.connect(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(dbConnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    db.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            dbConnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

dbConnect();

var CommandHandler = (function () {
    function CommandHandler(fChatLib, chan) {
        this.fChatLibInstance = fChatLib;
        this.channel = chan;
        _this = this;
    }

    //Public

    CommandHandler.prototype.stats = function (args, data) {
        statsGetter(args, data, data.character);
    };

    CommandHandler.prototype.getStats = function (args, data) {
		if (fChatLibInstance.isUserChatOP(data.character, _this.channel)) {
            statsGetter(this, args, data, args);
        }
        else{
            _this.fChatLibInstance.sendMessage("You don't have sufficient rights.", _this.channel);
        }
    };

    CommandHandler.prototype.register = function (args, data) {
		db.query("SELECT 1 FROM flistplugins.RDVF_stats WHERE name = ? LIMIT 1", [data.character], function(err, rows, fields){
            if(err){
                _this.fChatLibInstance.throwError(data, err, _this.channel);
            }
            else{
                if(rows.length > 0){
                    _this.fChatLibInstance.sendMessage("You're already registered.", _this.channel);
                }
                else{
                    var arrParam = args.split(",");
                    if(checkIfValidStats(arrParam)){
                        var finalArgs = [data.character, _this.channel].concat(arrParam);
                        db.query("INSERT INTO `flistplugins`.`RDVF_stats` (`name`, `room`, `strength`, `dexterity`, `endurance`, `spellpower`, `willpower`, `cloth`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", finalArgs, function (err) {
                            if (!err) {
                                _this.fChatLibInstance.sendMessage("Welcome! Enjoy your stay.", _this.channel);
                            }
                            else {
                                _this.fChatLibInstance.sendMessage("There was an error during the registration. Contact Lustful Aelith. " + err, _this.channel);
                            }
                        });
                    }
                }
            }

        });
    };

    function checkIfValidStats(arrParam){
        if(arrParam.length != 6){
            _this.fChatLibInstance.sendMessage("The number of parameters was incorrect. Example: !register 4,3,5,1,6,30", _this.channel);
        }
        else if(!arrParam.every(arg => isInt(arg))){
            _this.fChatLibInstance.sendMessage("All the parameters aren't integers. Example: !register 4,3,5,1,6,30", _this.channel);
        }
        else{
            //register
            var total = 0;
            var statsOnly = arrParam.slice(0,5);
            total = statsOnly.reduce(function(a, b) { return parseInt(a) + parseInt(b); }, 0);
            if(total != 20){
                _this.fChatLibInstance.sendMessage("The total of points you've spent isn't equal to 20. ("+total+"). Example: !register 4,3,5,1,7,30", _this.channel);
            }
            else if(parseInt(arrParam[0]) > 10 || (parseInt(arrParam[0]) < 1)){
                _this.fChatLibInstance.sendMessage("The Strength stat must be higher than 0 and lower than 10. Example: !register 4,3,5,1,7,30", _this.channel);
            }
            else if(parseInt(arrParam[1]) > 10 || (parseInt(arrParam[1]) < 1)){
                _this.fChatLibInstance.sendMessage("The Dexterity stat must be higher than 0 and lower than 10. Example: !register 4,3,5,1,7,30", _this.channel);
            }
            else if(parseInt(arrParam[2]) > 10 || (parseInt(arrParam[2]) < 1)){
                _this.fChatLibInstance.sendMessage("The Endurance stat must be higher than 0 and lower than 10. Example: !register 4,3,5,1,7,30", _this.channel);
            }
            else if(parseInt(arrParam[3]) > 10 || (parseInt(arrParam[3]) < 1)){
                _this.fChatLibInstance.sendMessage("The Spellpower stat must be higher than 0 and lower than 10. Example: !register 4,3,5,1,7,30", _this.channel);
            }
            else if(parseInt(arrParam[4]) > 10 || (parseInt(arrParam[4]) < 1)){
                _this.fChatLibInstance.sendMessage("The Willpower stat must be higher than 0 and lower than 10. Example: !register 4,3,5,1,7,30", _this.channel);
            }
            else if(parseInt(arrParam[5]) < 0 || parseInt(arrParam[5]) > 100){
                _this.fChatLibInstance.sendMessage("The starting cloth stat can't be higher than 100 or lower than 0. Example: !register 4,3,5,1,7,30", _this.channel);
            }
            else {
                return true;
            }
        }
        return false;
    }

    CommandHandler.prototype.restat = function (args, data) {
        db.query("SELECT 1 FROM flistplugins.RDVF_stats WHERE name = ? LIMIT 1", [data.character], function(err, rows, fields){
            if(err){
                _this.fChatLibInstance.throwError(data, err, _this.channel);
            }
            else{
                if(rows.length > 0){
                    var arrParam = args.split(",");
                    if(checkIfValidStats(arrParam)){
                        var finalArgs = arrParam.concat([data.character]);
                        db.query("UPDATE `flistplugins`.`RDVF_stats` SET `strength` = ?, `dexterity` = ?, `endurance` = ?, `spellpower` = ?, `willpower` = ?, `cloth` = ? WHERE `name` = ?;", finalArgs, function (err) {
                            if (!err) {
                                _this.fChatLibInstance.sendMessage("Your stats have successfully been changed.", _this.channel);
                            }
                            else {
                                _this.fChatLibInstance.sendMessage("There was an error during the restat. Contact Aelith Blanchette. " + err, _this.channel);
                            }
                        });
                    }
                }
                else{
                    _this.fChatLibInstance.sendMessage("You are not registered.", _this.channel);
                }
            }

        });
    };

    var statsGetter = function(args, data, character){
        db.query("SELECT name, strength, dexterity, endurance, spellpower, willpower, cloth FROM `flistplugins`.`RDVF_stats` WHERE name = ? LIMIT 1", data.character, function(err, rows, fields){
            if (rows != undefined && rows.length == 1) {
                var stats = rows[0];
                var hp = 100;
                if(stats.endurance > 4){
                    hp += (stats.endurance - 4)*10;
                }
                var mana = stats.willpower + "0";
                _this.fChatLibInstance.sendPrivMessage(data.character, "[b]" + data.character + "[/b]'s stats" + "\n" +
                    "[b][color=red]Strength[/color][/b]:  " + stats.strength + "      " + "[b][color=red]Hit Points[/color][/b]: " + hp + "\n" +
                    "[b][color=orange]Dexterity[/color][/b]:  " + stats.dexterity + "      " + "[b][color=pink]Mana[/color][/b]: " + mana + "\n" +
                    "[b][color=green]Endurance[/color][/b]:  " + stats.endurance + "      " + "[b][color=pink]Stamina[/color][/b]: " + 100 + "\n" +
                    "[b][color=cyan]Spellpower[/color][/b]:    " + stats.spellpower  + "      " + "[b][color=pink]Cloth[/color][/b]: " + stats.cloth + "\n" +
                    "[b][color=purple]Willpower[/color][/b]: " + stats.willpower);
            }
            else {
                _this.fChatLibInstance.sendPrivMessage(data.character, "You aren't registered yet.");
            }
        });
    };

    CommandHandler.prototype.reset = function (args, data) {
		if (_this.fChatLibInstance.isUserChatOP(data.character, _this.channel)) {
            if (checkIfFightIsGoingOn()) {
                resetFight();
                _this.fChatLibInstance.sendMessage("The ring has been cleared.", _this.channel);
            }
            else {
                _this.fChatLibInstance.sendMessage("The ring isn't occupied.", _this.channel);
            }
        }
        else {
            _this.fChatLibInstance.sendMessage("You don't have sufficient rights.", _this.channel);
        }
    };

    CommandHandler.prototype.ready = function (args, data) {
        if (currentFighters.length == 0) {
            db.query("SELECT name, strength, dexterity, endurance, spellpower, willpower, cloth FROM `flistplugins`.`RDVF_stats` WHERE name = ? LIMIT 1", [data.character], (err, rows, fields) =>{
                if (rows != undefined && rows.length == 1) {
                    currentFighters[0] = rows[0];
                    var hp = 100;
                    if(currentFighters[0].endurance > 4){
                        hp += (currentFighters[0].endurance - 4)*10;
                    }
                    currentFighters[0].hp = hp;
                    currentFighters[0].mana = parseInt(currentFighters[0].willpower)*10;
                    currentFighters[0].stamina = 100;
                    _this.fChatLibInstance.sendMessage(data.character + " is the first one to step in the ring, ready to fight! Who will be the lucky opponent?", _this.channel);
                }
                else{
                    _this.fChatLibInstance.sendMessage("You aren't registered yet.", _this.channel);
                }
            });
        }
        else if (currentFighters.length == 1) {
            if (currentFighters[0].name != data.character) {
                db.query("SELECT name, strength, dexterity, endurance, spellpower, willpower, cloth FROM `flistplugins`.`RDVF_stats` WHERE name = ? LIMIT 1", [data.character], function(err, rows, fields) {
                    if (rows != undefined && rows.length == 1) {
                        currentFighters[1] = rows[0];
                        var hp = 100;
                        if(currentFighters[1].endurance > 4){
                            hp += (currentFighters[1].endurance - 4)*10;
                        }
                        currentFighters[1].hp = hp;
                        currentFighters[1].mana = parseInt(currentFighters[1].willpower)*10;
                        currentFighters[1].stamina = 100;
                        _this.fChatLibInstance.sendMessage(data.character + " accepts the challenge! Let's get it on!", _this.channel);
                    }
                    else{
                        _this.fChatLibInstance.sendMessage("You aren't registered yet.", _this.channel);
                    }
                });
                setTimeout(function(){
                    if(currentFighters.length == 2){
                        battlefield = new arena();
                        initialSetup(currentFighters[0], currentFighters[1]);
                    }
                }, 2500);
            }
            else {
                _this.fChatLibInstance.sendMessage("You can't set yourself ready twice!", _this.channel);
            }
        }
        else {
            _this.fChatLibInstance.sendMessage("Sorry, our two wrestlers are still in the fight!", _this.channel);
        }
    };

    CommandHandler.prototype.exit = function (args, data) {
        if (currentFighters.length > 0) {
            if ((currentFighters.length > 0 && currentFighters[0] != undefined && currentFighters[0].name == data.character) || (currentFighters.length > 1 && currentFighters[1] != undefined && currentFighters[1].name == data.character)) {
                var isFirst = (currentFighters.length > 0 && currentFighters[0] != undefined && currentFighters[0].name == data.character);
                if(isFirst){
                    currentFighters[0].exit = true;
                }
                else{
                    currentFighters[1].exit = true;
                }
                if((currentFighters.length == 1 && isFirst) || (currentFighters[0].exit == true && currentFighters[1].exit == true)){
                    _this.fChatLibInstance.sendMessage("The fight has been ended.", _this.channel);
                    setTimeout(resetFight(),2500);
                }
                else{
                    _this.fChatLibInstance.sendMessage("The fight will end if your opponent types !exit too.", _this.channel);
                }
            }
            else {
                _this.fChatLibInstance.sendMessage("You are not in a fight.", _this.channel);
            }
        }
        else {
            _this.fChatLibInstance.sendMessage("There isn't any fight going on at the moment.", _this.channel);
        }
    };
    CommandHandler.prototype.leave = CommandHandler.prototype.exit;
    CommandHandler.prototype.leaveFight = CommandHandler.prototype.exit;

    CommandHandler.prototype.forfeit = function (args, data) {
        if (currentFighters.length > 0) {
            var isFirst = (currentFighters.length > 0 && currentFighters[0] != undefined && currentFighters[0].name == data.character);
            var isSecond = (currentFighters.length > 1 && currentFighters[1] != undefined && currentFighters[1].name == data.character);
            if (isFirst || isSecond) {
                var winner, loser;
                if(isFirst){
                    loser = currentFighters[0].name;
                    winner = currentFighters[1].name;
                }
                else{
                    loser = currentFighters[1].name;
                    winner = currentFighters[0].name;
                }
                _this.fChatLibInstance.sendMessage(""+ loser + " has forfeited the match.", _this.channel);
                endFight(winner, loser);
            }
            else {
                _this.fChatLibInstance.sendMessage("You are not in a fight.", _this.channel);
            }
        }
        else {
            _this.fChatLibInstance.sendMessage("There isn't any fight going on at the moment.", _this.channel);
        }
    };

    var attackFunc = function(attack, character){
        if(checkIfFightIsGoingOn()) {
            if (character.toLowerCase() == battlefield.getActor().name.toLowerCase()) {
                combatInput(attack);
            }
            else {
                _this.fChatLibInstance.sendMessage("It's not your turn.", _this.channel);
            }
        }
        else{
            _this.fChatLibInstance.sendMessage("There isn't any fight going on right now.", _this.channel);
        }
    };

    CommandHandler.prototype.light = function (args, data) {
        attackFunc("Light", data.character);
    };

    CommandHandler.prototype.heavy = function (args, data) {
        attackFunc("Heavy", data.character);
    };

    CommandHandler.prototype.grab = function (args, data) {
        attackFunc("Grab", data.character);
    };

    CommandHandler.prototype.tackle = function (args, data) {
        attackFunc("Tackle", data.character);
    };

    CommandHandler.prototype.ranged = function (args, data) {
        attackFunc("Ranged", data.character);
    };

    CommandHandler.prototype.focus = function (args, data) {
        attackFunc("Focus", data.character);
    };

    CommandHandler.prototype.move = function (args, data) {
        attackFunc("Move", data.character);
    };
    CommandHandler.prototype.escape = CommandHandler.prototype.move;
    CommandHandler.prototype.pursue = CommandHandler.prototype.move;

    CommandHandler.prototype.magic = function (args, data) {
        attackFunc("Magic", data.character);
    };

    CommandHandler.prototype.hex = function (args, data) {
        attackFunc("Hex", data.character);
    };

    CommandHandler.prototype.manaSurge = function (args, data) {
        attackFunc("Channel", data.character);
    };

    CommandHandler.prototype.surge = CommandHandler.prototype.manaSurge;
    CommandHandler.prototype.mana = CommandHandler.prototype.manaSurge;

    CommandHandler.prototype.rest = function (args, data) {
        attackFunc("Rest", data.character);
    };

    CommandHandler.prototype.rip = function (args, data) {
        attackFunc("Rip", data.character);
    };
    CommandHandler.prototype.ripclothes = CommandHandler.prototype.rip;

    CommandHandler.prototype.defensive = function (args, data) {
        attackFunc("Defensive", data.character);
    };

    return CommandHandler;
}());

module.exports = function (parent, channel) {
    var cmdHandler = new CommandHandler(parent, channel);
    return cmdHandler;
};


var currentFighters = [];
var currentFight = {bypassTurn: false, turn: -1, whoseturn: -1, isInit: false, orgasms: 0, winner: -1, currentHold: {}, actionTier: "", actionType: "", dmgHp: 0, dmgLust: 0, actionIsHold: false, diceResult: 0, intMovesCount: [0,0]};

function endFight(winner, loser){
    //record stats etc
    db.query("INSERT INTO `flistplugins`.`RDVF_fights` (`room`, `winner`, `loser`) VALUES (?, ?, ?)", [_this.channel, winner, loser], function (err) {
        if (!err) {
            //fChatLibInstance.sendMessage(battlefield.getActor().name + " won the match!", _this.channel);
        }
        else {
            _this.fChatLibInstance.sendMessage("There was an error while adding the fight record to the database. Contact Aelith Blanchette. " + err, _this.channel);
        }
    });
    resetFight();
}

function isInt(value) {
    return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

function checkIfFightIsGoingOn() {
    return currentFighters.length == 2;
}

function resetFight() {
    currentFighters = [];
    currentFight = {bypassTurn: false, turn: -1, whoseturn: -1, isInit: false, orgasms: 0, winner: -1, currentHold: {}, actionTier: "", actionType: "", dmgHp: 0, dmgLust: 0, actionIsHold: false, diceResult: 0, intMovesCount: [0,0]};
}

//BBParser shamelessly borrowed from the f-chat javascript. Feel free to skip on past this bit.
BBParser = function () {
    var a = {};
    a._urlregex = /^\s*((?:https?|ftps?|irc):\/\/[^\s\/$.?#"'].[^\s]*)\s*$/;
    a.validateURL = function (g) {
        return a._urlregex.test(g)
    };
    a.unescapeURL = function (g) {
        g.replace('"', "&quot;");
        g.replace("'", "&#39;");
        g.replace("<", "&lt;");
        g.replace(">", "&gt;");
        var k = document.createElement("div");
        k.innerHTML = g;
        return k.textContent
    };
    var b = {
            noparse: {
                render: function (g) {
                    return g
                },
                allowed: false
            },
            b: {
                opentag: "strong",
                closetag: "strong",
                allowed: true
            },
            i: {
                opentag: "em",
                closetag: "em",
                allowed: true
            },
            u: {
                opentag: 'span style="text-decoration:underline;"',
                closetag: "span",
                allowed: true
            },
            s: {
                opentag: "del",
                closetag: "del",
                allowed: true
            },
            sub: {
                opentag: "sub",
                closetag: "sub",
                allowed: ["b", "i", "u"]
            },
            sup: {
                opentag: "sup",
                closetag: "sup",
                allowed: ["b", "i", "u"]
            },
            url: {
                render: function (g, k) {
                    if (typeof g == undefined || g.length == 0) {
                        g = k;
                        k = undefined
                    }
                    if (typeof k != "undefined") {
                        k = k.replace(/ /g, "%20");
                        if (a.validateURL(k) && !a.validateURL(g)) {
                            var l = a._urlregex.exec(k),
                                m = l[1].match(/(https?|ftps?|irc):\/\/(?:www.)?([^\/]+)/)[2],
                                p = document.createElement("div"),
                                q = document.createElement("a");
                            q.href = a.unescapeURL(l[1]);
                            q.className = "ParsedLink ImageLink";
                            q.target = "_blank";
                            q.textContent = g.replace(/&amp;/g, "&");
                            p.appendChild(q);
                            return p.innerHTML + ' <span style="font-size: 0.8em;">[' + m + "]</span>"
                        } else return "[bad url: " + k + "] " + g
                    } else if (a.validateURL(g)) {
                        l = a._urlregex.exec(g);
                        p = document.createElement("div");
                        q = document.createElement("a");
                        q.href = a.unescapeURL(l[1]);
                        q.className = "ParsedLink ImageLink";
                        q.target = "_blank";
                        q.textContent = l[1];
                        p.appendChild(q);
                        return p.innerHTML
                    } else return "[bad url: " +
                        g + "] "
                },
                allowed: false
            },
            color: {
                render: function (g, k) {
                    return '<span style="color:' + k + ';">' + g + "</span>"
                },
                allowed: true
            }
        }, c = null,
        d = null,
        e = false,
        f = null,
        h = /(\[[\[ \/]*)([^\[\]]+)([\] ]*\])/,
        n = false,
        o = "Text cut: too long.",
        t = function (g, k) {
            for (var l = 0; l < k.length; l++)
                if (k[l] == g) return true;
            return false
        }, x = function (g, k) {
            if (!b[k]) return true;
            k = b[k].allowed;
            if (g == true && k == true) return true;
            if (typeof k == "undefined") return g;
            if (g == false) return false;
            for (var l = [], m = 0; m < k.length; m++)
                if (g == true || t(g, k[m])) l.push(k[m]);
            return l.length == 0 ? false : l
        }, v = function (g, k, l) {
            if (g instanceof Array) {
                k = "";
                for (var m = 0; m < g.length; m++) k += v(g[m], l, x(l, g[m].tagname));
                return k
            }
            if (g.tagname == "text") {
                if (n && /\w{50,}/.test(c.substring(g.start, g.end))) return o;
                return c.substring(g.start, g.end)
            }
            if (g.tagname && k != false && (k == true || t(g.tagname, k))) {
                m = b[g.tagname];
                if (!g.content) return "";
                k = v(g.content, k, l);
                return typeof m.render == "function" ? m.render(k, g.attribute) : "<" + m.opentag + ">" + k + "</" + m.closetag + ">"
            } else e && g.tagname && f.push("The [" + g.tagname +
                "] tag is not allowed here: " + c.substr(g.start, 60) + "...");
            return c.substring(g.start, g.end)
        }, w = function (g, k, l) {
            for (var m = 0; m < g.length; m++) {
                if (g[m].tagname == "text") {
                    if (m == 0) g[m].start = k;
                    if (m == g.length - 1) g[m].end = l
                }
                if (m > 0 && g[m - 1].tagname == "text") g[m - 1].end = g[m].start
            }
        }, u = function (g, k, l, m) {
            if (g != null) {
                var p = g.openstart,
                    q = g.openend;
                if (g.tagname == "noparse") {
                    var r = "[/noparse]";
                    q = c.substring(g.openend, l).indexOf(r);
                    if (q > -1) q += g.openend + 10;
                    else q = l;
                    return {
                        tagname: "noparse",
                        start: g.openstart,
                        end: q,
                        content: [{
                            tagname: "text",
                            start: g.openstart + 9,
                            end: q - 10
                        }]
                    }
                }
                p = {
                    tagname: g.tagname,
                    attribute: g.attribute,
                    start: g.openstart
                };
                m = u(null, q + 1, l, m + 1);
                k = m[m.length - 1].end;
                r = "[/";
                r = c.substring(k, l).indexOf(r);
                if (r > -1) r += k;
                var s = c.substring(r, l).indexOf("]");
                if (s > -1) s += r;
                var y = c.substring(r + 2, s);
                if (r > -1 && y == g.tagname) {
                    p.end = s + 1;
                    p.content = m
                } else {
                    if (e) c.substring(k, l).indexOf("[/" + g.tagname) == -1 ? f.push("Open [" + g.tagname + "] tag is not properly closed (with [/" + g.tagname + "]).") : f.push("Bad BBCode in [" + g.tagname + "] tag, somewhere around/after '" +
                        c.substr(q + 1, 50) + "...'.");
                    p.tagname = "text";
                    p.end = r == -1 || s == -1 ? l : s + 1
                }
                w(m, q + 1, r);
                p.content = m;
                return p
            } else {
                p = c.substring(k, l).indexOf("[");
                if (p > -1) p += k;
                q = c.substring(p, l).indexOf("]");
                if (q > -1) q += p;
                r = null;
                if (p > -1 && q > -1) {
                    g = c.substring(p + 1, q).match(/^([a-z]+)(?:=([^\]]+))?/i);
                    if (g != null) {
                        r = g[1].toLowerCase();
                        if (b[r]) {
                            r = {
                                tagname: r
                            };
                            if (g[2]) r.attribute = g[2];
                            r = r
                        } else {
                            e && f.push("This looks like a bbcode tag, but isn't one: [" + r + "]");
                            r = null
                        }
                    } else r = null
                } else return [{
                    tagname: "text",
                    start: k,
                    end: k
                }];
                if (r == null) return [{
                    tagname: "text",
                    start: k,
                    end: k
                }];
                g = [];
                if (k < p) {
                    k = u(null, k, p, m + 1);
                    for (s = 0; s < k.length; s++) g.push(k[s])
                }
                r.openstart = p;
                r.openend = q;
                p = u(r, q, l, m + 1, true);
                g.push(p);
                if (p.end < l) {
                    k = u(null, p.end, l, m + 1);
                    for (s = 0; s < k.length; s++) g.push(k[s])
                }
                return g
            }
        };

    return {
        Util: a,
        parseBB: function (g) {
            if (e) f = [];
            for (var k = g.replace(/\[\]/g, "&#91;&#93;"), l = 1, m = 0; l !== null;) {
                l = h.exec(k.substr(m));
                if (l !== null) {
                    if (l[2].indexOf("=") != -1) l[2] = l[2].slice(0, l[2].indexOf("="));
                    if (l[1] != "[" && l[1] != "[/" || l[3] != "]" || !b[l[2]]) {
                        var p = l[0].replace(/\[/g, "&#91;").replace(/\]/g,
                            "&#93;");
                        k = k.slice(0, m + l.index) + p + k.slice(m + l.index + l[0].length);
                        m = m + l.index + p.length
                    } else m += l[0].length
                }
            }
            c = k;
            d = u(null, 0, c.length, 0);
            w(d, 0, c.length);
            k = v(d, true, true);
            if (k.length == 0 && g.length > 0) {
                g = g;
                f.push("Toplevel tag structure errors found. Check your out-most tags.")
            } else g = k;
            if (e && f.length > 0) {
                k = '<div style="border: 2px solid yellow; padding: 3px; background: #600; color: white; margin-bottom: 1.5em;">Warning: The BBCode parser has found errors in your code.<ul style="margin-top: 0.5em; margin-bottom: 0.5em; padding-left: 1em; margin-left: 0.5em; list-style-type: square;">';
                for (var q in f) k += "<li>" + f[q].replace(/\n/g, "") + "</li>";
                k += "</ul></div>";
                g = k + g
            }
            d = c = null;
            return g
        },
        parseEmotes: function (g) {
            ["hex-smile", "heart", "hex-yell", "hex-sad", "hex-grin", "hex-red", "hex-razz", "hex-twist", "hex-roll", "hex-mad", "hex-confuse", "hex-eek", "hex-wink", "lif-angry", "lif-blush", "lif-cry", "lif-evil", "lif-gasp", "lif-happy", "lif-meh", "lif-neutral", "lif-ooh", "lif-purr", "lif-roll", "lif-sad", "lif-sick", "lif-smile", "lif-whee", "lif-wink", "lif-wtf", "lif-yawn", "cake"].forEach(function (l) {
                g = g.replace(RegExp(":" +
                    l + ":", "gim"), "<img src='http://f-list.com/images/smileys/" + l + ".png' alt='" + l + " emote' title=':" + l + ":' align='middle'/>")
            });
            return g
        },
        parseContent: function (g) {
            g = this.parseBB(g);
            if (/<br ?\/?>/.test(g) == false) g = "";
            return this.parseEmotes(g)
        },
        addCustomTag: function (g, k, l) {
            b[g] = {
                render: l,
                allowed: k
            }
        },
        addSimpleTag: function (g, k, l, m) {
            b[g] = {
                opentag: k,
                closetag: l,
                allowed: m
            }
        },
        enableWarnings: function () {
            e = true
        },
        replaceLongWordsWith: function (g) {
            n = true;
            o = g
        }
    }
};


//----------------------------------------------------------------------------------
// All the Rendezvous Fight specific code can be found in the section below.
//----------------------------------------------------------------------------------
//----------------------------------------------------------------------------------
// Functions and classes
//----------------------------------------------------------------------------------

// Pass rollDice an array of integers, get back a result as if each of those numbers were a die with that many sides.
// For example, rollDice ( [6,6,6] ) would return the result of a 3d6 roll, and rollDice([20]) would return the result of a 1d20 roll.
function rollDice(dice) {
    var total = 0;
    for (var i = 0, len = dice.length; i < len; i++) {
        total += Math.ceil(Math.random() * dice[i]);
    }
    return total;
};

// Pretty much what it says on the tin, returns 1 or 0 at random.
function coinflip() {
    return Math.round(Math.random());
};

// Force a value (n) onto the range min to max. Careful to pass this function only actual numeric values, if n, min, or max cannot be converted into a number, you'll just get back NaN as the result.
// Probably ought to add some validation at some point to fix that.
function clamp(n, min, max) {
    return Math.max(min, Math.min(n, max));
};

//windowController is a collection of functions and message strings used to control what is actually output to the page. It doesn't need to be instantiated, it's not a class... just a handy way of collecting related items and referencing things.
var windowController = {
    _tagParser: new BBParser(),
    _rollovers: {
        "Strength": "Strength. <br /> This is your base damage stat; the higher this is, the higher your basic attacks will be. This affects all attacks besides ranged attacks and magic.",
        "Dexterity": "Dexterity. <br /> This is your accuracy and dodge stat; the higher this is, the more likely you will be able to dodge attacks or reduce their effects, or strike with more precision on your own.",
        "Endurance": "Endurance. <br /> This is your basic defense stat; the higher this is the more health you will have and the faster your stamina will refill over time.",
        "Spellpower": "Spellpower. <br /> This is your magic stat; the higher this is, the more damage you will deal.",
        "Willpower": "Willpower. <br /> This is your mana-pool stat; the higher this is, the more magic attacks you can perform and the faster you will regain mana. Willpower also makes you more resistant to being knocked out or disoriented.",
        "HP": "Hit Points. <br />How much health you have initially.",
        "Mana": "Mana. <br />How much mana you have initially.",
        "Stamina": "Stamina. <br />How much stamina you have initially.",
        "Cloth": "Cloth. <br />How durable your clothes are. <br />Typically, fighters start with 20 points of cloth per major item of clothing worn.",
        "StatPoints": "Maximum Stat Points. <br /> The maximum number of points each fighter may have spread among their stats. Typically 20. If you wish to allow fighters to have any number of points in their stats (including uneven fights where one fighter has an advantage), set this value to 0.",
        "GameSpeed": "Game speed. <br /> This value works as a multiplier to all damage. A value of 2, for example, would double damage. A value of 0.5 would halve damage. You may want to reduce it if you allow a higher than normal number of stat points (26-32 or more).",
        "DisorientedAt": "Dizzy. <br /> If a fighter's HP falls too far below this value they will become disoriented and take a penalty to all their actions. Affected by the fighters Willpower.",
        "UnconsciousAt": "KO'd. <br />If a fighter's HP falls below this value they will be knocked out and become helpless. Affected by the fighters Willpower.",
        "DeadAt": "Dead. <br />If a fighter's HP falls below this value they will be killed. Not affected by the fighters Willpower; Dead is Dead.",
        "Light": "Light attack (20 Stamina) <br />Punches, weak kicks, weak weapon uses and such. Deals some damage and also reduces the target's stamina. <br /> Strength adds to damage and affects the chance to hit. <br />Intelligence adds to stamina damage. <br />Dexterity affects defense.",
        "Heavy": "Heavy attack (35 Stamina) <br />Heavy kicks, weapons, combos, etc. Harder to perform, but deal more damage. <br />Strength greatly affects damage and affects chance to hit.<br /> Dexterity affects defense.",
        "Grab": "Grab (35 Stamina, 20 if successful) <br />Deals little damage initially. But once grabbed, the opponent is held until they manage to escape by using the Grab action as well. Light and Heavy attacks can be used in a grab, as well as Grab for a submission hold. Target has reduced strength and dexterity while grabbed. <br />Strength and Dexterity affect chance to hit. <br />Strength affects the damage of submission moves. <br />Dexterity affects defense. <br />Reduced stamina cost if successful.",
        "Rip": "Rip/Damage Clothes (Free) <br />Does no HP damage, damaging clothes instead. Much greater effect when used in a grab. 1 piece of clothing equals 20 points. Keep that in mind. If you only have bikini on you, it is 40 points, for 2 pieces. You can use this stat anyway you like as well.",
        "Tackle": "Tackle or Throw (40 Stamina, 20 if successful.) <br />Deals stamina damage and stuns the opponent, preventing them from taking their next action. (Effectively letting you perform another action). Tackle during Grab releases opponent. <br /> Strength and Dexterity affects chance to hit. <br />Dexterity greatly affects defense.  <br />Reduced stamina cost if successful.",
        "Magic": "Magic attack (24 Mana) <br /> Blasts, bombs, and magical might. Attack your opponents from range, if you have the reservesIntelligence greatly affects damage.",
        "Ranged": "Ranged attack (20 Stamina) <br /> Small arms, bows and throwing knives, and minor innate magical powers (eye beams, frost breath and such). Ranged attacks are stamina efficient, and deal moderate damage based on either Dexterity or Intelligence (whichever is higher), but are only so-so in terms of accuracy unless you take the time to Aim/Focus first.",
        "Rest": "Rest (Free) <br />Restores stamina. <br /> Endurance affects stamina regained. <br />Wisdom affects the likelihood of successfully resting in stressful conditions.",
        "Channel": "Channel (Free) <br />Restores mana at the cost of stamina. <br /> Willpower affects the amount of stamina converted into mana, and affects the likelihood of successfully channeling in stressful conditions.",
        "Focus": "Focus/Aim (Free) <br />Increases concentration. Makes you slightly harder to hit, and considerably improves your accuracy. <br /> Willpower affects how much damage you may take before your focus/aim is lost, and affects the likelihood of successfully focusing/aiming in stressful conditions.",
        "Move": "Escape/Pursue (20 stamina) <br />If you are being grappled, Escape/Pursue will let you attempt to break free. When you are not grappling, escape will open up some distance between you and your opponent, forcing them to pursue you or try to tackle you if they want to use melee attacks. When your opponent is at a distance, Escape/Pursue will let you pursue them, trying to force them back into melee..",
        "Defense": "Makes it harder to hit for everyone",
        "Hex": "Magical attack that reduces resistance against magic."
    },
    getRolloverKeys: function () {
        var keys = [];
        for (var key in this._rollovers) {
            if (this._rollovers.hasOwnProperty(key)) { //to be safe
                keys.push("[name='" + key + "']");
            }
        }
        return keys;
    },
    setToolTip: function (key) {
        //$("#HoverTip").html(this._rollovers[key]);
    },
    clearToolTip: function () {
        //$("#HoverTip").empty();
    },
    messages: {
        action: [],
        hit: [],
        damage: 0,
        status: [],
        hint: [],
        special: [],
        info: [],
        error: []
    },
    _formatMessage: {
        action: function (message) {
            return "Action: " + message + " ";
        },
        damage: function (message) {
            return "[color=yellow]( Damage: " + message + " )[/color]";
        },
        hit: function (message) {
            return "[color=red][b]" + message + "[/b][/color]";
        },
        hint: function (message) {
            return "[color=cyan]" + message + "[/color]";
        },
        special: function (message) {
            return "\n[color=red]" + message + "[/color]";
        }
    },
    _windowPanels: {},
    _activePanel: "",
    _verifyPanelExists: function (targetID) {
        if (typeof targetID !== "string") return 0;
        if (targetID === "") return 0;
        if (this._windowPanels.filter("#" + targetID).length) return 1;
        return 0;
    },

    _updatePanel: function () {
        //if (this._activePanel === "") this._activePanel = this._windowPanels.first().attr("id");
        //
        //if (!this._verifyPanelExists(this._activePanel)) {
        //    console.log("windowController._updatePanel: _activePanel has been set to an invalid value. No panel with ID (#" + this._activePanel + ") exists.");
        //    return;
        //}
        //
        //this._windowPanels.find(":input").attr("checked", false);
        //
        //var targetPanel = $("#" + this._activePanel);
        //if (targetPanel.is(':visible')) {
        //    this._windowPanels.not(targetPanel).hide()
        //    this._windowPanels.not(targetPanel).filter(":input").attr("disabled", true);
        //} else {
        //    var disabledPanels = this._windowPanels.filter(':visible');
        //    windowController.clearToolTip();
        //    disabledPanels.fadeTo(300, 0, function () {
        //        disabledPanels.hide();
        //        disabledPanels.attr("disabled", true);
        //        targetPanel.fadeIn(300);
        //        targetPanel.find(":input").attr("disabled", false);
        //    });
        //}
    },

    switchToPanel: function (targetID) {
        if (!this._verifyPanelExists(targetID)) {
            console.log("windowController.switchToPanel: No panel with ID (#" + targetID + ") exists.");
            return;
        }

        this._activePanel = targetID;
        this._updatePanel();
    },

    nextPanel: function () {
        if (this._activePanel === "") {
            this._activePanel = this._windowPanels.first().attr("id");
            return;
        }

        if (!this._verifyPanelExists(this._activePanel)) {
            console.log("windowController.nextPanel: _activePanel has been set to an invalid value. No panel with ID (#" + this._activePanel + ") exists.");
            return;
        }

        var targetPanel = this._windowPanels.siblings("#" + this._activePanel).next().attr("id");

        if (typeof targetPanel !== "undefined") {
            this._activePanel = targetPanel;
        } else {
            this._activePanel = this._windowPanels.first().attr("id"); //If already on last panel, loop around to first
        }

        this._updatePanel();
    },

    prevPanel: function () {
        if (this._activePanel === "") {
            this._activePanel = this._windowPanels.last().attr("id");
            return;
        }

        if (!this._verifyPanelExists(this._activePanel)) {
            console.log("windowController.prevPanel: _activePanel has been set to an invalid value. No panel with ID (#" + this._activePanel + ") exists.");
            return;
        }

        var targetPanel = this._windowPanels.siblings("#" + this._activePanel).prev().attr("id");
        if (typeof targetPanel !== "undefined") {
            this._activePanel = targetPanel;
        } else {
            this._activePanel = this._windowPanels.last().attr("id"); //If already on first panel, loop around to last
        }

        this._updatePanel();
    },

    updateOutput: function () {
        this.addInfo("This is "+battlefield.getActor().name+"'s turn."); //
        var lines = [""];
        if (this.messages.action.length) lines[0] += this._formatMessage.action(this.messages.action.join(" "));
        if (this.messages.damage != 0) lines[0] += this._formatMessage.damage(this.messages.damage);
        if (lines[0] == "") lines = [];

        if (this.messages.hit.length) lines.push(this._formatMessage.hit(this.messages.hit.join("\n")));
        if (this.messages.status.length) lines.push(this.messages.status.join("\n"));
        if (this.messages.hint.length) lines.push(this._formatMessage.hint(this.messages.hint.join("\n")));
        if (this.messages.special.length) lines.push(this._formatMessage.special(this.messages.special.join("\n")));
        if (this.messages.info.length) lines.push("\n" + this.messages.info.join("\n"));

        _this.fChatLibInstance.sendMessage(lines.join("\n"), _this.channel);
        if (this.messages.error.length) {
            _this.fChatLibInstance.sendMessage(this.messages.error.join("\n"), _this.channel);
        }

        //clear messages from the queue once they have been displayed
        this.messages = {action: [], hit: [], damage: 0, status: [], hint: [], special: [], info: [], error: []};
    },

    addAction: function (line) {
        if (typeof line === "string") this.messages.action.push(line);
    },
    addHit: function (line) {
        if (typeof line === "string") this.messages.hit.push(line);
    },
    addStatus: function (line) {
        if (typeof line === "string") this.messages.status.push(line);
    },
    setDamage: function (damage) {
        this.messages.damage = Math.floor(damage);
    },
    addHint: function (line) {
        if (typeof line === "string") this.messages.hint.push(line);
    },
    addSpecial: function (line) {
        if (typeof line === "string") this.messages.special.push(line);
    },
    addInfo: function (line) {
        if (typeof line === "string") this.messages.info.push(line);
    },
    addError: function (line) {
        if (typeof line === "string") this.messages.error.push(line);
    },
    calcFormHP: function (target) {
        var hp = 0;
        if (parseInt(target.value) == target.value) hp = (target.value * 10) + 60;
        //$(target).siblings("input[name=HP]").val(hp);
        //$(target).siblings("span[name=maxHP]").html(hp);
    },

    calcFormMana: function (target) {
        var mana = 0;
        if (parseInt(target.value) == target.value) mana = (target.value * 10);
        //$(target).siblings("input[name=Mana]").val(mana);
        //$(target).siblings("span[name=maxMana]").html(mana);
    }
};

// Arena : The Arena class determines the stage, stores the global settings like gameSpeed, collects the fighters involved in a combat, and tracks things like which fighter's turn it currently is.
function arena() {
    if (!(this instanceof arena)) return new arena(); //protection against calling this as a function rather than instantiating it with new.
    this._fighters = [];
    this._currentFighter;
    this.stage = this.pickStage();
    this.inGrabRange = false; //We define the variable that controls distance and set the fighters outside grab range to beging with.
    this.displayGrabbed= true;

    //Set default values for global settings
    this._globalFighterSettings = {
        "GameSpeed": 1,
        "StatPoints": 20,
        "DeadAt": 0,
        "UnconsciousAt": 25,
        "DisorientedAt": 40
    };
};

arena.prototype = {
    setGlobalFighterSettings: function (settings) {
        if (parseInt(settings.StatPoints) == settings.StatPoints) this._globalFighterSettings.StatPoints = settings.StatPoints;
        if (parseInt(settings.DeadAt) == settings.DeadAt) this._globalFighterSettings.DeadAt = Math.max(settings.DeadAt, 0);
        if (parseInt(settings.UnconsciousAt) == settings.UnconsciousAt) this._globalFighterSettings.UnconsciousAt = Math.max(settings.UnconsciousAt, this._globalFighterSettings.DeadAt);
        if (parseInt(settings.DisorientedAt) == settings.DisorientedAt) this._globalFighterSettings.DisorientedAt = Math.max(settings.DisorientedAt, this._globalFighterSettings.UnconsciousAt);
        if (!(isNaN(settings.GameSpeed))) this._globalFighterSettings.GameSpeed = settings.GameSpeed;
    },

    addFighter: function (settings) {
        try {
            this._fighters.push(new fighter(settings, this._globalFighterSettings));
        } catch (err) {
            console.log(err.message);
            return 0;
        }

        return 1;
    },

    clearFighters: function () {
        this._fighters = [];
    },

    getActor: function () {
        return this._fighters[this._currentFighter];
    },

    getTarget: function () {
        return this._fighters[1 - this._currentFighter]; //Just a placeholder in case I add actual targeting of attacks and group fights later
    },

    outputFighterStatus: function () {
        for (var i = 0, len = this._fighters.length; i < len; i++) windowController.addStatus(this._fighters[i].getStatus());
    },

    outputFighterStats: function () {
        for (var i = 0, len = this._fighters.length; i < len; i++) windowController.addStatus(this._fighters[i].getStatBlock());
    },

    nextFighter: function () {
        this._currentFighter = (this._currentFighter == this._fighters.length - 1) ? 0 : this._currentFighter + 1;

        if (this._fighters[this._currentFighter].isStunned) {
            this._fighters[this._currentFighter].isStunned = false;
            this.nextFighter();
        }
    },

    pickInitialActor: function () {
        this._currentFighter = Math.floor(Math.random() * this._fighters.length);
    },

    pickStage: function () {
        var stages = [
            "The Pit",
            "RF:Wrestling Ring",
            "Arena",
            "Subway",
            "Skyscraper Roof",
            "Forest",
            "Cafe",
            "Street road",
            "Alley",
            "Park",
            "RF:MMA Hexagonal Cage",
            "Hangar",
            "Swamp",
            "RF:Glass Box",
            "RF:Free Space",
            "Magic Shop",
            "Public Restroom"
            ];

        return stages[Math.floor(Math.random() * stages.length)];
    },

    turnUpkeep: function () {
        for (var i = 0, len = this._fighters.length; i < len; i++) {
            this._fighters[i].updateCondition();
        }

        this._fighters[this._currentFighter].regen();
        this.nextFighter();
    }
};

// Fighter : The fighter class stores the information specific to each fighter (name, hit points, etc.), and provides functions for handling attacks and effects like the end of turn regeneration/upkeep.
// The fighter class also provides accessors for the character attributes and damage functions, so that it's easier to implement/change things like the game speed setting, or the effects of being stunned.
function fighter(settings, globalSettings) {
    if (!(this instanceof fighter)) return new fighter(settings); //protection against calling this as a function rather than instantiating it with new.
    var errors = [];
    this.name = settings.Name;

    //TODO: Check numeric fields for invalid values
    //var nonNumericFields = ["Name"];
    //$.each(settings, function (key, value) {
    //    if ((jQuery.inArray(key, nonNumericFields) == -1) && (parseInt(value) != value)) errors.push(settings.Name + " settings are invalid: " + key + " cannot have a value of " + value + ".");
    //});

    //Set stats from settings
    this._strength = (+settings.Strength);
    this._dexterity = (+settings.Dexterity);
    this._endurance = (+settings.Endurance);
    this._spellpower = (+settings.Spellpower);
    this._willpower = (+settings.Willpower);

    this._dizzyValue = Math.max(globalSettings.DisorientedAt - (this._willpower * 2), 0);
    this._koValue = Math.max(globalSettings.UnconsciousAt - (this._willpower * 2), 0);
    this._deathValue = globalSettings.DeadAt;

    //Check stat points for conformity to rules
    if (this._strength > 10 || this._strength < 1) errors.push(settings.Name + "'s Strength is outside the allowed range (1 to 10).");
    if (this._dexterity > 10 || this._dexterity < 1) errors.push(settings.Name + "'s Dexterity is outside the allowed range (1 to 10).");
    if (this._endurance > 10 || this._endurance < 1) errors.push(settings.Name + "'s Endurance is outside the allowed range (1 to 10).");
    if (this._spellpower > 10 || this._spellpower < 1) errors.push(settings.Name + "'s Spellpower is outside the allowed range (1 to 10).");
    if (this._willpower > 10 || this._willpower < 1) errors.push(settings.Name + "'s Willpower is outside the allowed range (1 to 10).");

    var stattotal = this._strength + this._dexterity + this._endurance + this._spellpower + this._willpower;
    if (stattotal != globalSettings.StatPoints && globalSettings.StatPoints != 0)  errors.push(settings.Name + " has stats that are too high or too low (" + stattotal + " out of " + globalSettings.StatPoints + " points spent).");

    if (errors.length) {
        for (var i = 0, len = errors.length; i < len; i++) windowController.addError(errors[i]);
        throw new Error(settings.Name + " was not created due to invalid settings.");
    }

    this._maxHP = 60 + this._endurance * 10;
    this._maxMana = this._willpower * 10;
    this._manaCap = this._maxMana;
    this._maxStamina = 100;

    this.manaBurn = 0;

    this._damageEffectMult = globalSettings.GameSpeed;

    this.hp = 0;
    this.addHp(settings.HP);

    this.mana = 0;
    this.addMana(settings.Mana);

    this.stamina = 0;
    this.addStamina(settings.Stamina);

    this.cloth = 0;
    this.addCloth(settings.Cloth);
    
    this.rollTotal = 0; // Two values that we track in order to calculate average roll, which we will call Luck on the output screen.
    this.rollsMade = 0; // Luck = rollTotal / rollsMade
    this.lastRolls = [];

    this._statDelta = {hp: this.hp, mana: this.mana, stamina: this.stamina, cloth: this.cloth};

    this.isUnconscious = false;
    this.isDead = false;
    this.isRestrained = false;
    this.isStunned = false;
    this.isDisoriented = 0;
    this.isGrappledBy = [];
    this.isFocused = 0;
    this.isEscaping = 0;//A bonus to escape attempts that increases whenever you fail one.
    this.isEvading = false;
    this.isExposed = 0;
    this.hasAttackBonus = 0;
    this.hasMagicWeakness = 0;
};

fighter.prototype = {
    strength: function () {
        var total = this._strength;
        if (this.isDisoriented > 0) total -= 1;
        //if (this.isRestrained) total -= 2;
        total = Math.max(total, 1);
        total = Math.ceil(total);
        return total;
    },

    dexterity: function () {
        var total = this._dexterity;
        if (this.isDisoriented > 0) total -= 1;
        //if (this.isRestrained) total -= 2;
        total = Math.max(total, 1);
        total = Math.ceil(total);
        return total;
    },

    endurance: function () {
        var total = this._endurance;
        if (this.isDisoriented > 0) total -= 1;
        total = Math.max(total, 1);
        total = Math.ceil(total);
        return total;
    },

    spellpower: function () {
        var total = this._spellpower;
        if (this.isDisoriented > 0) total -= 1;
        total = Math.max(total, 1);
        total = Math.ceil(total);
        return total;
    },

    willpower: function () {
        var total = this._willpower;
        if (this.isDisoriented > 0) total -= 1;
        total = Math.max(total, 1);
        total = Math.ceil(total);
        return total;
    },

    addHp: function (n) {
        var x = ~~n;
        this.hp += x * this._damageEffectMult;
        this.hp = clamp(this.hp, 0, this._maxHP);
    },

    addMana: function (n) {
        var x = ~~n;
        this.mana += x;
        this.mana = clamp(this.mana, 0, this._manaCap);
    },

    addStamina: function (n) {
        var x = ~~n;
        this.stamina += x;
        this.stamina = clamp(this.stamina, 0, this._maxStamina);
    },

    addCloth: function (n) {
        var x = ~~n;
        this.cloth += x;
        this.cloth = Math.max(this.cloth, 0);
    },

    hitHp: function (n) {
        var x = ~~n;
        x *= this._damageEffectMult;
        this.hp -= x;
        this.hp = clamp(this.hp, 0, this._maxHP);
        windowController.setDamage(x);

        if (this.isFocused) {
            if (this.isRestrained) x *= 1.5;
            if (this.isDisoriented) x += this.isDisoriented;
            this.isFocused = Math.max(this.isFocused - x, 0);
            if (this.isFocused == 0) windowController.addHint(this.name + " has lost their focus/aim!");
        }
    },

    hitMana: function (n) {
        var x = ~~n;
        this.mana -= x;
        this.mana = clamp(this.mana, 0, this._manaCap);
    },

    hitStamina: function (n) {
        var x = ~~n;
        this.stamina -= x;
        this.stamina = clamp(this.stamina, 0, this._maxStamina);
    },

    hitCloth: function (n) {
        var x = ~~n;
        this.cloth -= x * this._damageEffectMult;
        this.cloth = Math.max(this.cloth, 0);
    },

    pickFatality: function () {
        var fatalities = [
            "Decapitation",
            "Strangulation",
            "Beating to death",
            "Exposing internal organs",
            "Blood loss",
            "Heart damage",
            "Brain damage",
            "Breaking Neck",
            "Breaking bones",
            "Dismemberment",
            "Crushing",
            "Severing the jaw",
            "Remove top part of a head",
            "Maceration",
            "Brutality!",
            "Slow and sensual death",
            "Extremely staged and theatrical finisher"];

        return fatalities[Math.floor(Math.random() * fatalities.length)];
    },

    regen: function () {
        if (this._manaCap > this._maxMana) {
            this._manaCap = Math.max(this._manaCap - this.manaBurn, this._maxMana);
            this.manaBurn = 10;
        }

        if (this._manaCap == this._maxMana) this.manaBurn = 0;

        if (this.isUnconscious == false) {//We removed evading attacks status, so we no longer have to check for it.
            var stamBonus = 2 + this.endurance();
            this.addStamina(stamBonus);
            var manaBonus = 2 + this.willpower();
            this.addMana(manaBonus);
            // windowController.addHint( "At the end of her turn, " + this.name + " recovered " + stamBonus + " stamina and " + manaBonus + " mana."  );
        } else {
            this.isStunned = true;
        }
    },

    getStatBlock: function () {
        return "[color=cyan]" + this.name + " stats: Strength:" + this.strength() + " Dexterity:" + this.dexterity() + " Endurance:" + this.endurance() + " Spellpower:" + this.spellpower() + " Willpower:" + this.willpower() + "[/color]";
    },

    getStatus: function () {
        var hpDelta = this.hp - this._statDelta.hp;
        var staminaDelta = this.stamina - this._statDelta.stamina;
        var manaDelta = this.mana - this._statDelta.mana;
        var clothDelta = this.cloth - this._statDelta.cloth;

        var message = "[color=orange]" + this.name;
        message += "[/color][color=yellow] hit points: " + this.hp;
        if (hpDelta > 0) message += "[color=cyan] (+" + hpDelta + ")[/color]";
        if (hpDelta < 0) message += "[color=red] (" + hpDelta + ")[/color]";

        message += "[/color][color=green] stamina: " + this.stamina;
        if (staminaDelta > 0) message += "[color=cyan] (+" + staminaDelta + ")[/color]";
        if (staminaDelta < 0) message += "[color=red] (" + staminaDelta + ")[/color]";

        message += "[/color] mana: " + this.mana;
        if (manaDelta > 0) message += "[color=cyan] (+" + manaDelta + ")[/color]";
        if (manaDelta < 0) message += "[color=red] (" + manaDelta + ")[/color]";

        message += "|";
        if (this._manaCap > this._maxMana) message += "[color=cyan]";
        message += this._manaCap;
        if (this._manaCap > this._maxMana) message += "[/color]";

        message += "[color=purple] cloth: " + this.cloth + "[/color]";
        if (clothDelta > 0) message += "[color=cyan] (+" + clothDelta + ")[/color]";
        if (clothDelta < 0) message += "[color=red] (" + clothDelta + ")[/color]";

        this._statDelta = {hp: this.hp, stamina: this.stamina, mana: this.mana, cloth: this.cloth};

        if (this.isRestrained) windowController.addHint(this.name + " is Grappled.");
        if (this.isFocused) windowController.addHint(this.name + " is Aimed/Focused.");
        if (battlefield.inGrabRange && battlefield.displayGrabbed){
            windowController.addHint("The fighters are in grappling range"); //Added notification about fighters being in grappling range.
        }
        battlefield.displayGrabbed = !battlefield.displayGrabbed; //only output it on every two turns
        if (this.isEvading) windowController.addHint(this.name + " is fighting defensively.");
        if (this.hasAttackBonus > 0) windowController.addHint(this.name + " has built up a +" + this.hasAttackBonus + " heavy attack bonus.");
        if (this.hasMagicWeakness > 0) windowController.addHint(this.name + " would take " + this.hasMagicWeakness + " extra damage from a magical attack.");
        return message;
    },

    updateCondition: function () {
        if (this.isGrappledBy.length != 0 && this.isRestrained == false) this.isRestrained = true;
        if (this.isGrappledBy.length == 0 && this.isRestrained == true) this.isRestrained = false;
        
        if (this.isEscaping > 0 && !this.isRestrained || this.isEscaping < 0) this.isEscaping = 0;//If you have ane scape bonus, but you're not grappled it should get cancled. And the escape bonus can't be negative either.

        if (this.stamina < rollDice([20]) && this.isFocused > 0) {
            windowController.addHint(this.name + " lost their focus/aim because of fatigue!");
            this.isFocused = 0;
        }

        if (this.hp > this._dizzyValue && this.isDisoriented > 0) {
            this.isDisoriented -= 1;
            if (this.isDisoriented == 0) windowController.addHint(this.name + " has recovered and is no longer disoriented!");
        }

        if (this.hp <= this._dizzyValue && this.isDisoriented == 0) {
            this.isDisoriented = 1;
            windowController.addHit(this.name + " is dizzy! Stats penalty!");
        }
        
        if (this.isExposed > 0) {
            this.isExposed -= 1;
            if (this.isExposed == 0) windowController.addHint(this.name + " has recovered from the missed attack and can no longer be easily grabbed!");
        }

        if (this.hp <= this._koValue && this.isUnconscious == false) {
            this.isUnconscious = true;
            //windowController.addHit(this.name + " is permanently Knocked Out (or extremely dizzy, and can not resist)! Feel free to use this opportunity! " + this.name + " must not resist! Continue beating them to get a fatality suggestion.");
        }

        if (this.hp <= this._deathValue && this.isDead == false) {
            this.isDead = true;
            windowController.addHit("The fight is over! CLAIM YOUR SPOILS and VICTORY and FINISH YOUR OPPONENT!");
            windowController.addSpecial("FATALITY SUGGESTION: " + this.pickFatality());
            windowController.addSpecial("It is just a suggestion, you may not follow it if you don't want to.");
            endFight(battlefield.getActor().name, battlefield.getTarget().name);
        }
    },

    buildActionTable: function (difficulty, targetDex, attackerDex, attackerHitBonus) {
        var rangeMult = (20 - difficulty) / 40; //0.225
        var attackTable = {miss: 0, dodge: 0, glancing: 0, crit: 0}

        attackTable.miss = difficulty; //11
        if (typeof attackerHitBonus !== 'undefined') {
            attackTable.miss -= Math.ceil(attackerHitBonus * rangeMult); //8
            attackTable.miss = Math.max(0, attackTable.miss); //8
        }
        // Basing hit chance on difference multiplied by rangeMulti so that we have ideal DEX difference rather than ideal absolute DEX value.
        if (attackerDex > targetDex) {
            attackTable.dodge = difficulty + Math.floor((targetDex - Math.max(attackerDex, attackerHitBonus)) * rangeMult); //Used floor to make the result a more negative value.
        } else { // Attacker uses either dexterity or a potential alternative attribute to make the attack.
            attackTable.dodge = difficulty + Math.ceil((targetDex - Math.max(attackerDex, attackerHitBonus)) * rangeMult);
        }
        //attackTable.dodge = attackTable.miss + Math.ceil(targetDex * rangeMult); //9
        attackTable.glancing = attackTable.dodge + Math.floor((targetDex - Math.max(attackerDex, attackerHitBonus)) * 2 * rangeMult); // Formula uses either attacker's dex or an alternative attribute.
        attackTable.crit = 21 - Math.ceil(Math.max(attackerDex, attackerHitBonus) * rangeMult); // Formula uses either attacker's dex or an alternative attribute.
        return attackTable;
    },

    actionLight: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var baseDamage = roll / 2; //Not directly affected by crits
        var damage = Math.max( (attacker.strength() + attacker.dexterity()) / 2, attacker.strength());	//Affected by crits and the like
        var stamDamage = attacker.spellpower(); //This value + damage is drained from the targets stamina if the attack is successful
        var requiredStam = 15;
        var difficulty = 4;

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if the attacker is dizzy.
        if (attacker.isRestrained) difficulty += 2; //Up the difficulty if the attacker is restrained.
        //if (target.isFocused) difficulty += 2;
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the target is dizzy.
        if (target.isRestrained) difficulty -= 2; //Lower it if the target is restrained.
        if (attacker.isFocused) difficulty -= 4; //Lower the difficulty if the attacker is focused.
        if (attacker.isEvading) difficulty += 2; //It's harder to make an attack if you're fighting defensively.
        if (target.isEvading) difficulty += 2; //It's harder to hit somone who is fighting defesnively, but being ranged helps.
        if (target.isExposed) difficulty -= 2; // If opponent left themself wide open after a failed strong attack, they'll be easier to hit.

        if (attacker.stamina < requiredStam) {	//Not enough stamina-- reduced effect
            damage *= attacker.stamina / requiredStam;
            difficulty += Math.ceil(((requiredStam - attacker.stamina) / requiredStam)*(20 - difficulty)); // Too tired? You might miss more often.
            windowController.addHint(attacker.name + " did not have enough stamina, and took penalties to the attack.");
        }
        // attacker.hitStamina (requiredStam); //Now that stamina has been checked, reduce the attacker's stamina by the appopriate amount.

        //if (attacker.isEvading || target.isEvading) {
        //    difficulty += 6; //Up the difficulty if the target is evading melee.
        //    damage /= 2;
        //    stamDamage /= 2;
        //    windowController.addHint(attacker.name + " was forced to pursue " + target.name + " and took penalties to the attack.");
        //}
        
        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.dexterity());
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit(" MISS! ");
            attacker.hitStamina(requiredStam);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(" DODGE! ");
            windowController.addHint(target.name + " dodged the attack. ");
            attacker.hitStamina(requiredStam - (attacker.spellpower() * 2));
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing && target.canDodge(attacker)) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHit(" GLANCING HIT! ");
            windowController.addHint(target.name + " avoided taking full damage. ");
            damage /= 2;
            stamDamage /= 2;
        } else if (roll >= attackTable.crit) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHit(" CRITICAL HIT! ");
            windowController.addHint(attacker.name + " landed a particularly vicious blow!");
            damage *= 2; //Only x2 in this case because this bonus will also factor into the stamina damage.
        } else { //Normal hit.
            windowController.addHit(" HIT! ");
        }

        //Deal all the actual damage/effects here.

        attacker.hitStamina(requiredStam);
        
        if (battlefield.inGrabRange) {// Succesful attacks will beat back the grabber before they can grab you, but not if you're already grappling.
            if (!attacker.isRestrained && !target.isRestrained) {
                battlefield.inGrabRange = false;
                windowController.addHit(attacker.name + " knocked " + target.name + " back with the attack and they are no longer in grappling range!");
            }
        }

        damage += baseDamage;
        damage = Math.max(damage, 1);
        target.hitHp(damage);
        stamDamage += damage;
        //windowController.addHint(attacker.name + " dealt " + Math.floor(stamDamage) + " stamina damage to " + target.name + ".");
        //disabled for now
        //target.hitStamina(stamDamage);
        target.hitCloth(3);
        attacker.hasAttackBonus += 1; // Hitting with light attacks sets you up to hit with a heavy.
        windowController.addHit(attacker.name + " gained +1 heavy attack bonus!");
        return 1; //Successful attack, if we ever need to check that.
    },

    actionHeavy: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var baseDamage = roll;
        var damage = 2 * attacker.strength();
        var requiredStam = 30;
        var difficulty = 8; //Base difficulty, rolls greater than this amount will hit.
        
        // Attack bonus generated by ligt attacks reduces difficulty of heavy and is then used up.
        if (attacker.hasAttackBonus > 0) {
            difficulty -= attacker.hasAttackBonus;
            baseDamage += attacker.hasAttackBonus;
            attacker.hasAttackBonus = 0;
            windowController.addHit(attacker.name + " used up the heavy attack bonus!");
        }

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if the attacker is dizzy.
        if (attacker.isRestrained) difficulty += 2; //Up the difficulty if the attacker is restrained.
        //if (target.isFocused) difficulty += 2;
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the target is dizzy.
        if (target.isRestrained) difficulty -= 2; //Lower it if the target is restrained.
        if (attacker.isFocused) difficulty -= 4; //Lower the difficulty if the attacker is focused
        if (attacker.isEvading) difficulty += 2; //It's harder to make an attack if you're fighting defensively.
        if (target.isEvading) difficulty += 2; //It's harder to hit somone who is fighting defesnively, but being ranged helps.
        if (target.isExposed) difficulty -= 2; // If opponent left themself wide open after a failed strong attack, they'll be easier to hit.
        
        var critCheck = true;
        if (attacker.stamina < requiredStam) {	//Not enough stamina-- reduced effect
            critCheck = false;
            baseDamage *= attacker.stamina / requiredStam;
            damage *= attacker.stamina / requiredStam;
            difficulty += Math.ceil(((requiredStam - attacker.stamina) / requiredStam)*(20 - difficulty)); // Too tired? You're likely to miss.
            windowController.addHint(attacker.name + " did not have enough stamina, and took penalties to the attack.");
        }
        //attacker.hitStamina (requiredStam); //Now that stamina has been checked, reduce the attacker's stamina by the appopriate amount.

        //if (attacker.isEvading || target.isEvading) {
        //    damage /= 2;
        //    difficulty += 6; //Up the difficulty if the target is evading melee.
        //    windowController.addHint(attacker.name + " was forced to pursue " + target.name + " and took penalties to the attack.");
        //}

        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.dexterity());
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit(" MISS! ");
            attacker.hitStamina(requiredStam);
            attacker.isExposed += 2; //If the fighter misses a big attack, it leaves them open and they have to recover balance which gives the opponent a chance to strike.
            windowController.addHint(attacker.name + " was left wide open by the failed attack and " + target.name + " has the opportunity to grab them!");
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(" DODGE! ");
            windowController.addHint(target.name + " dodged the attack. ");
            attacker.hitStamina(requiredStam - (attacker.spellpower() * 2));
            attacker.isExposed += 2; //If the fighter misses a big attack, it leaves them open and they have to recover balance which gives the opponent a chance to strike.
            windowController.addHint(attacker.name + " was left wide open by the failed attack and " + target.name + " has the opportunity to grab them!");
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing && target.canDodge(attacker)) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHit(" GLANCING HIT! ");
            windowController.addHint(target.name + " avoided taking full damage. ");
            damage /= 2;
        } else if (roll >= attackTable.crit && critCheck == true) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHit(" CRITICAL HIT! ");
            windowController.addHint(attacker.name + " landed a particularly vicious blow!");
            damage *= 2; //Even at just x2 damage, a critical heavy is a game changer.
        } else { //Normal hit.
            windowController.addHit(" HIT! ");
        }

        //Deal all the actual damage/effects here.

        attacker.hitStamina(requiredStam);
        
        if (battlefield.inGrabRange) {// Succesful attacks will beat back the grabber before they can grab you, but not if you're already grappling.
            if (!attacker.isRestrained && !target.isRestrained) {
                battlefield.inGrabRange = false;
                windowController.addHit(attacker.name + " knocked " + target.name + " back with the attack and they are no longer in grappling range!");
            }
        }

        damage += baseDamage;
        damage = Math.max(damage, 1);
        target.hitHp(damage);
        target.hitCloth(5);
        return 1; //Successful attack, if we ever need to check that.
    },

    actionGrab: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var baseDamage = roll / 4;
        var damage = attacker.strength() / 2;
        var requiredStam = 20;
        var difficulty = 6; //Base difficulty, rolls greater than this amount will hit.

        //if (attacker.isRestrained) difficulty += 2; //Up the difficulty slightly if the attacker is restrained.
        //if (target.isRestrained) difficulty += 2; //Submission moves are more difficult

        if (target.isRestrained) difficulty += Math.max(2, 4 + Math.floor((target.strength() - attacker.strength()) / 2)); //Up the difficulty of submission moves based on the relative strength of the combatants. Minimum of +0 difficulty, maximum of +8.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if the attacker is dizzy.
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the target is dizzy.
        //if (target.isFocused) difficulty += 2; // Up the difficulty if the target is focused
        if (attacker.isFocused) difficulty -= 4; //Lower the difficulty if the attacker is focused
        if (attacker.isEvading) difficulty += 2; //It's harder to make an attack if you're fighting defensively.
        if (target.isEvading) difficulty += 2; //It's harder to hit somone who is fighting defesnively, but being ranged helps.

        var critCheck = true;
        if (attacker.stamina < requiredStam) {	//Not enough stamina-- reduced effect
            critCheck = false;
            baseDamage *= attacker.stamina / requiredStam;
            damage *= attacker.stamina / requiredStam;
            difficulty += Math.ceil(((requiredStam - attacker.stamina) / requiredStam)*(20 - difficulty)); // Too tired? You're likely to miss.
            windowController.addHint(attacker.name + " did not have enough stamina, and took penalties to the attack.");
        }
        
        attacker.hitStamina (requiredStam); //Now that stamina has been checked, reduce the attacker's stamina by the appopriate amount. (We'll hit the attacker up for the rest on a miss or a dodge).

        if (target.isExposed < 1 && !battlefield.inGrabRange) {//When you're out of grappling range a grab will put you into grappling range without a roll.
            battlefield.inGrabRange = true;
            windowController.addHit(attacker.name + " moved into grappling range! " + target.name + " can try to push them away with an attack.");
            return 1; //Successful attack, if we ever need to check that.
        }

        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.dexterity());
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit(" FAILED! ");
            windowController.addHint(attacker.name + " failed to establish a hold!");
            attacker.hitStamina(requiredStam);

            //attacker.hitStamina (15);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(" DODGE! ");
            windowController.addHint(target.name + " was too fast, and escaped before " + attacker.name + " could establish a hold.");
            attacker.hitStamina(requiredStam - (attacker.spellpower() * 2));

            //attacker.hitStamina (15);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHint(target.name + " put up quite a struggle, costing " + attacker.name + " additional stamina. ");
            attacker.hitStamina(10 + target.strength());
        } else if (roll >= attackTable.crit && critCheck) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHint("Critical! " + attacker.name + " found a particularly good hold and " + target.name + " lost stamina!");
            //damage *= 2;
            target.hitStamina(10 + attacker.strength()); //Half STR extra damage is too low for a crit. Better to damage opponent's stamina.
        }

        if (attacker.isGrappling(target)) {
            windowController.addHit(" SUBMISSION ");
            damage += attacker.strength() * 2;
            target.isDisoriented += 2; //Submission moves disorient the target.
            target.isEscaping -= 3; //Submission moves make it harder to escape.
            if (target.isGrappling(attacker)) {
                attacker.removeGrappler(target);
                windowController.addHint(target.name + " is in a SUBMISSION hold, taking damage and suffering disorientation from the pain. " + attacker.name + " is also no longer at a penalty from being grappled!");
            } else {
                windowController.addHint(target.name + " is in a SUBMISSION hold, taking damage and suffering disorientation from the pain.");
            }
        } else {
            windowController.addHit(attacker.name + " GRABBED " + target.name + "! ");
            windowController.addHint(target.name + " is being grappled! " + attacker.name + " can use Grab to try for a submission hold or Tackle to throw them - dealing damage, but setting them free.");
            target.isGrappledBy.push(attacker.name);
            if (target.isEvading || attacker.isEvading) { //A successful grab puts an end to evading attacks.
                target.isEvading = false;
                attacker.isEvading = false;
            }
        }
        
        //If we managed to grab without being in grab range, we are certainly in grabe range afterwards.
        if (!battlefield.inGrabRange) battlefield.inGrabRange = true;
        
        damage += baseDamage;
        damage = Math.max(damage, 1);
        target.hitHp(damage);
        target.hitCloth(4);
        return 1; //Successful attack, if we ever need to check that.
    },

    actionRip: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();

        //if (attacker.isEvading || target.isEvading) {
        //    windowController.addHit(target.name + " IS TOO FAR AWAY! ");
        //    return 0; //Failed attack, if we ever need to check that.
        //}

        if (attacker.isGrappling(target)) {
            target.hitCloth(roll * 2);
            windowController.addHit(attacker.name + " rips " + target.name + "'s clothes in a grab!");
        } else {
            target.hitCloth(roll);
            windowController.addHit(attacker.name + " damages " + target.name + "'s clothes!");
        }

        return 1; //Successful attack, if we ever need to check that.
    },

    actionTackle: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var baseDamage = roll / 2; //Not directly affected by crits
        var damage = attacker.strength();	//Affected by crits and the like
        var stamDamage = 30;
        var requiredStam = 30;
        var difficulty = 8; //Base difficulty, rolls greater than this amount will hit.

        if (attacker.isRestrained) difficulty += Math.max(0, 8 + Math.floor((target.strength() - attacker.strength()) / 2)); //When grappled, up the difficulty based on the relative strength of the combatants. Minimum of +4 difficulty, maximum of +12.
        if (attacker.isRestrained) difficulty -= attacker.isEscaping; //Then reduce difficulty based on how much effort we've put into escaping so far.
        if (target.isRestrained) difficulty -= 4; //Lower the difficulty considerably if the target is restrained.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if the attacker is dizzy.
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the target is dizzy.
        if (attacker.isFocused) difficulty -= 4; //Lower the difficulty if the attacker is focused
        if (attacker.isEvading) difficulty += 2; //It's harder to make an attack if you're fighting defensively.
        if (target.isEvading) difficulty += 2; //It's harder to hit somone who is fighting defesnively, but being ranged helps.
        if (target.isExposed) difficulty -= 2; // If opponent left themself wide open after a failed strong attack, they'll be easier to hit.

        // if (target.isEvading) requiredStam += 20; //Increase the stamina cost if the target is not in melee

        var critCheck = true;
        if (attacker.stamina < requiredStam) {	//Not enough stamina-- reduced effect
            critCheck = false;
            baseDamage *= attacker.stamina / requiredStam;
            damage *= attacker.stamina / requiredStam;
            stamDamage *= attacker.stamina / requiredStam;
            difficulty += Math.ceil(((requiredStam - attacker.stamina) / requiredStam)*(20 - difficulty)); // Too tired? You're likely to miss.
            windowController.addHint(attacker.name + " did not have enough stamina, and took penalties to the attack.");
        }
        
        attacker.hitStamina (requiredStam); //Now that stamina has been checked, reduce the attacker's stamina by the appopriate amount. (We'll hit the attacker up for the rest on a miss or a dodge).
        
        if (attacker.isEvading) { // If you try to tackle someone, you're not evading anymore.
            windowController.addHint(attacker.name + " had to stop focusing on defense in order to charge " + target.name + ".");
            attacker.isEvading = false;
        }

        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.dexterity());
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit(" MISS! ");
            if (attacker.isRestrained) attacker.isEscaping += 6;//If we fail to escape, it'll be easier next time.
            attacker.hitStamina(requiredStam);
            battlefield.inGrabRange = true; //Even a failed tackle still brings the fighters together.
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(" DODGE! ");
            windowController.addHint(target.name + " dodged the attack. ");
            if (attacker.isRestrained) attacker.isEscaping += 6;//If we fail to escape, it'll be easier next time.
            attacker.hitStamina(requiredStam);
            battlefield.inGrabRange = true; //Even a failed tackle still brings the fighters together.
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing && target.canDodge(attacker)) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHint(target.name + " rolled with the blow. They are still stunned, but lost less stamina. ");
            //stamDamage -= 10;
        } else if (roll >= attackTable.crit && critCheck == true) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHint("Critical Hit! " + attacker.name + " really drove that one home!");
            damage *= 2;
            //stamDamage *= 1.5;
        }

        if (target.isEvading) { // You are not evading my attacks after I tackle you.
            windowController.addHint(target.name + " is no longer focusin on defense " + target.name + ". ");
            target.isEvading = false;
        }

        if (attacker.isGrappling(target)) {
            target.removeGrappler(attacker);
            battlefield.inGrabRange = false;//A throw will put the fighters out of grappling range.
            if (target.isGrappling(attacker)) {
                attacker.removeGrappler(target);
                windowController.addHit(attacker.name + " gained the upper hand and THREW " + target.name + "! " + attacker.name + " can make another move! " + attacker.name + " is no longer at a penalty from being grappled!");
            } else {
                windowController.addHit(attacker.name + " THREW " + target.name + "! " + attacker.name + " can make another move!");
            }
            windowController.addHint(target.name + ", you are no longer grappled. You should make your post, but you should only emote being hit, do not try to perform any other actions.");
        } else if (target.isGrappling(attacker)) {
            attacker.removeGrappler(target);
            battlefield.inGrabRange = false;//A throw will put the fighters out of grappling range.
            windowController.addHit(attacker.name + " found a hold and THREW " + target.name + " off! " + attacker.name + " can make another move! " + attacker.name + " is no longer at a penalty from being grappled!");
            windowController.addHint(target.name + ", you should make your post, but you should only emote being hit, do not try to perform any other actions.");
        } else {
            battlefield.inGrabRange = true;//A regular tackle will put you close enough to your opponent to initiate a grab.
            windowController.addHit(attacker.name + " TACKLED " + target.name + ". " + attacker.name + " can take another action while their opponent is stunned!");
            windowController.addHint(target.name + ", you should make your post, but you should only emote being hit, do not try to perform any other actions.");
        }

        //Deal all the actual damage/effects here.

        damage += baseDamage;
        damage = Math.max(damage, 1);
        stamDamage = Math.max(stamDamage, 1);
        target.hitHp(damage);
        //windowController.addHint(attacker.name + " dealt " + Math.floor(stamDamage) + " stamina damage to " + target.name + ".");
        //target.hitStamina(stamDamage);
        target.isStunned = true;
        return 1; //Successful attack, if we ever need to check that.
    },

    actionRanged: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var baseDamage = roll;
        var damage = Math.max( (attacker.dexterity() + attacker.strength()) / 2, (attacker.dexterity() + attacker.spellpower()) / 2);
        var requiredStam = 25;
        var difficulty = 8; //Base difficulty, rolls greater than this amount will hit.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty considerably if the attacker is dizzy.
        if (attacker.isRestrained) difficulty += 4; //Up the difficulty considerably if the attacker is restrained.
        //if (target.isFocused) difficulty += 4;
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the target is dizzy.
        if (target.isRestrained) difficulty -= 2; //Lower the difficulty slightly if the target is restrained.
        if (attacker.isFocused) difficulty -= 4; //Lower the difficulty considerably if the attacker is focused
        if (attacker.isEvading) difficulty += 2; //It's harder to make an attack if you're fighting defensively.
        if (target.isEvading) difficulty += 2; //It's harder to hit somone who is fighting defesnively, but being ranged helps.
        if (target.isExposed) difficulty -= 2; // If opponent left themself wide open after a failed strong attack, they'll be easier to hit.

        var critCheck = true;
        if (attacker.stamina < requiredStam) {	//Not enough stamina-- reduced effect
            critCheck = false;
            baseDamage *= attacker.stamina / requiredStam;
            damage *= attacker.stamina / requiredStam;
            difficulty += Math.ceil(((requiredStam - attacker.stamina) / requiredStam)*(20 - difficulty)); // Too tired? You're likely to miss.
            windowController.addHint(attacker.name + " did not have enough stamina, and took penalties to the attack.");
        }
        // attacker.hitStamina (requiredStam); //Now that stamina has been checked, reduce the attacker's stamina by the appopriate amount.

        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.dexterity());
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit(" MISS! ");
            attacker.hitStamina(requiredStam);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(" DODGE! ");
            windowController.addHint(target.name + " dodged the attack. ");
            attacker.hitStamina(requiredStam);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing && target.canDodge(attacker)) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHit(" GLANCING HIT! ");
            windowController.addHint(target.name + " only took a flesh wound. ");
            damage /= 2;
        } else if (roll >= attackTable.crit && critCheck == true) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHit(" CRITICAL HIT! ");
            windowController.addHint(attacker.name + " hit somewhere that really hurts!");
            damage *= 2;
        } else { //Normal hit.
            windowController.addHit(" HIT! ");
        }

        //Deal all the actual damage/effects here.

        attacker.hitStamina(requiredStam);
        
        if (battlefield.inGrabRange) {// Succesful attacks will beat back the grabber before they can grab you, but not if you're already grappling.
            if (!attacker.isRestrained && !target.isRestrained) {
                battlefield.inGrabRange = false;
                windowController.addHit(attacker.name + " knocked " + target.name + " back with the attack and they are no longer in grappling range!");
            }
        }
        
        damage += baseDamage;
        damage = Math.max(damage, 1);
        target.hitHp(damage);
        target.hitCloth(3);
        return 1; //Successful attack, if we ever need to check that.
    },

    actionMagic: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var baseDamage = roll - target.spellpower() + target.hasMagicWeakness;
        var damage = 2 * attacker.spellpower();
        var requiredMana = 20;
        var difficulty = 8; //Base difficulty, rolls greater than this amount will hit.

        if (attacker.isRestrained) difficulty += 4; //Math.max(2, 4 + Math.floor((target.strength() - attacker.strength()) / 2)); //When grappled, up the difficulty based on the relative strength of the combatants. Minimum of +2 difficulty, maximum of +8.
        if (target.isRestrained) difficulty -= 2; //Lower the difficulty considerably if the target is restrained.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if the attacker is dizzy.
        //if (target.isFocused) difficulty += 4;
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the target is dizzy.
        if (attacker.isFocused) difficulty -= 4; //Lower the difficulty if the attacker is focused
        if (attacker.isEvading) difficulty += 2; //It's harder to make an attack if you're fighting defensively.
        if (target.isEvading) difficulty += 2; //It's harder to hit somone who is fighting defesnively, but being ranged helps.
        if (target.isExposed) difficulty -= 2; // If opponent left themself wide open after a failed strong attack, they'll be easier to hit.

        var critCheck = true;
        if (attacker.mana < requiredMana) {	//Not enough mana-- reduced effect
            critCheck = false;
            baseDamage *= attacker.mana / requiredMana;
            damage *= attacker.mana / requiredMana;
            difficulty += Math.ceil(((requiredMana - attacker.mana) / requiredMana)*(20 - difficulty)); // Too tired? You're likely to have your spell fizzle.
            windowController.addHint(attacker.name + " did not have enough mana, and took penalties to the attack.");
        }
        // attacker.hitMana (requiredMana); //Now that required mana has been checked, reduce the attacker's mana by the appopriate amount.

        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.willpower());//Magic now uses willpower to determine hitting & missing, but DEX still decides critical and glancing hits.
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit(" FAILED! ");
            attacker.hitMana(requiredMana);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(" DODGE! ");
            windowController.addHint(target.name + " dodged the attack. ");
            attacker.hitMana(requiredMana);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing && target.canDodge(attacker)) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHit(" GLANCING HIT! ");
            windowController.addHint(target.name + " avoided taking full damage. ");
            damage /= 2;
        } else if (roll >= attackTable.crit) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHit(" CRITICAL HIT! ");
            windowController.addHint(attacker.name + " landed a particularly vicious blow!");
            damage *= 2; //Magical crits don't deal as much bonus damage, but...
            target.isDisoriented = 4; //They tend to leave the target dazed
            windowController.addHint("Critical Hit! " + attacker.name + "'s magic worked abnormally well! " + target.name + " is dazed and disoriented.");
        } else { //Normal hit.
            windowController.addHit("MAGIC HIT! ");
        }

        //Deal all the actual damage/effects here.

        attacker.hitMana(requiredMana);
        
        if (battlefield.inGrabRange) {// Succesful attacks will beat back the grabber before they can grab you, but not if you're already grappling.
            if (!attacker.isRestrained && !target.isRestrained) {
                battlefield.inGrabRange = false;
                windowController.addHit(attacker.name + " knocked " + target.name + " back with the attack and they are no longer in grappling range!");
            }
        }

        damage += baseDamage;
        damage = Math.max(damage, 1);
        target.hitHp(damage);
        target.hitCloth(5);
        return 1; //Successful attack, if we ever need to check that.
    },

    actionHex: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var baseDamage = roll/2 - target.spellpower() + target.hasMagicWeakness;
        var damage = attacker.spellpower();
        var requiredMana = 10;
        var hexDamage = 1; //How much the hex will make the target vulerable to future magic damage.
        var difficulty = 6; //Base difficulty, rolls greater than this amount will hit.

        if (attacker.isRestrained) difficulty += 4; //Math.max(2, 4 + Math.floor((target.strength() - attacker.strength()) / 2)); //When grappled, up the difficulty based on the relative strength of the combatants. Minimum of +2 difficulty, maximum of +8.
        if (target.isRestrained) difficulty -= 2; //Lower the difficulty considerably if the target is restrained.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if the attacker is dizzy.
        //if (target.isFocused) difficulty += 4;
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the target is dizzy.
        if (attacker.isFocused) difficulty -= 4; //Lower the difficulty if the attacker is focused
        if (attacker.isEvading) difficulty += 2; //It's harder to make an attack if you're fighting defensively.
        if (target.isEvading) difficulty += 2; //It's harder to hit somone who is fighting defesnively, but being ranged helps.
        if (target.isExposed) difficulty -= 2; // If opponent left themself wide open after a failed strong attack, they'll be easier to hit.

        var critCheck = true;
        if (attacker.mana < requiredMana) {	//Not enough mana-- reduced effect
            critCheck = false;
            baseDamage *= attacker.mana / requiredMana;
            damage *= attacker.mana / requiredMana;
            difficulty += Math.ceil(((requiredMana - attacker.mana) / requiredMana)*(20 - difficulty)); // Too tired? You're likely to have your spell fizzle.
            windowController.addHint(attacker.name + " did not have enough mana, and took penalties to the attack.");
        }
        // attacker.hitMana (requiredMana); //Now that required mana has been checked, reduce the attacker's mana by the appopriate amount.

        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.willpower());//Magic now uses willpower to determine hitting & missing, but DEX still decides critical and glancing hits.
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit(" FAILED! ");
            attacker.hitMana(requiredMana);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(" DODGE! ");
            windowController.addHint(target.name + " dodged the attack. ");
            attacker.hitMana(requiredMana);
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing && target.canDodge(attacker)) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHit(" GLANCING HIT! ");
            windowController.addHint(target.name + " avoided taking full damage. ");
            damage /= 2;
            hexDamage = 0;
        } else if (roll >= attackTable.crit) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHit(" CRITICAL HIT! ");
            windowController.addHint(attacker.name + " landed a particularly vicious blow!");
            damage *= 2; //Magical crits don't deal as much bonus damage, but...
            hexDamage *= 2;
            target.isDisoriented = 4; //They tend to leave the target dazed
            windowController.addHint("Critical Hit! " + attacker.name + "'s magic worked abnormally well! " + target.name + " is dazed and disoriented.");
        } else { //Normal hit.
            windowController.addHit("MAGIC HIT! ");
        }

        //Deal all the actual damage/effects here.

        attacker.hitMana(requiredMana);
        
        if (battlefield.inGrabRange) {// Succesful attacks will beat back the grabber before they can grab you, but not if you're already grappling.
            if (!attacker.isRestrained && !target.isRestrained) {
                battlefield.inGrabRange = false;
                windowController.addHit(attacker.name + " knocked " + target.name + " back with the attack and they are no longer in grappling range!");
            }
        }

        damage += baseDamage;
        damage = Math.max(damage, 1);
        target.hitHp(damage);
        target.hitCloth(3);
        target.hasMagicWeakness += hexDamage;//The hex reduces resistance against further magical attacks.
        windowController.addHit(attacker.name + " reduced " + target.name + "'s magic resistance by " + hexDamage + "!");
        return 1; //Successful attack, if we ever need to check that.
    },

    actionRest: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();

        var difficulty = 1; //Base difficulty, rolls greater than this amount will succeed.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if you are dizzy.
        if (attacker.isRestrained) difficulty += 9; //Up the difficulty considerably if you are restrained.
       // if (attacker.isEvading || target.isEvading) difficulty -= 4; //Lower the difficulty if you are not in melee.

        if (attacker.isEvading) attacker.isEvading = false; //If you stop to rest, you stop evading melee.

        difficulty -= attacker.willpower();

        if (roll <= difficulty) {	//Failed!
            windowController.addHint(attacker.name + " was too disoriented or distracted to get any benefit from resting.");
            return 0; //Failed action, if we ever need to check that.
        }

        windowController.addInfo("Dice Roll Required: " + (difficulty+1));
        var stamBonus =  10+(2 * parseInt(roll))+ (attacker.willpower() * 3);  //(3 * parseInt(roll)) + (attacker.endurance() * 2);
        var hpBonus = Math.floor(3 + attacker.willpower());
        var manaBonus = hpBonus;
        attacker.addStamina(stamBonus);
        attacker.addHp(hpBonus);
        attacker.addMana(manaBonus);
        windowController.addHit(attacker.name + " SKIPS MOVE, RESTING!");
        windowController.addHint(attacker.name + " recovered " + stamBonus + " stamina from resting, and a moderate amount of mana and health.");
        return 1;
    },

    actionFocus: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();

        var difficulty = 4; //Base difficulty, rolls greater than this amount will succeed.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if you are dizzy.
        if (attacker.isRestrained) difficulty += 2; //Up the difficulty considerably if you are restrained.
        //if (attacker.isEvading || target.isEvading) difficulty -= 4; //Lower the difficulty if you are not in melee.

        difficulty -= attacker.willpower();

        if (roll <= difficulty) {	//Failed!
            windowController.addHint(attacker.name + " was too disoriented or distracted to focus.");
            return 0; //Failed action, if we ever need to check that.
        }

        windowController.addInfo("Dice Roll Required: " + (difficulty+1));
        windowController.addHit(attacker.name + " FOCUSES/AIMS!");
        attacker.isFocused = (roll + attacker.willpower()) * 2;
        return 1;
    },

    actionChannel: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();

        var difficulty = 4; //Base difficulty, rolls greater than this amount will succeed.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if you are dizzy.
        if (attacker.isRestrained) difficulty += 4; //Up the difficulty considerably if you are restrained.
        //if (attacker.isEvading || target.isEvading) difficulty -= 4; //Lower the difficulty if you are not in melee.

        difficulty -= attacker.willpower();

        if (roll <= difficulty) {	//Failed!
            windowController.addHint(attacker.name + " was too disoriented or distracted to channel.");
            return 0; //Failed action, if we ever need to check that.
        }

        windowController.addInfo("Dice Roll Required: " + (difficulty+1));
        var manaShift = 20 + roll + (attacker.willpower() * 2);
        manaShift = Math.min(manaShift, attacker.stamina);
        // manaShift = Math.min( manaShift, attacker._maxMana - attacker.mana);

        attacker._manaCap = Math.max(attacker._manaCap, attacker.mana + manaShift);
        attacker.hitStamina(manaShift);
        attacker.addMana(manaShift);
        windowController.addHit(attacker.name + " CHANNELS STAMINA INTO MANA!");
        windowController.addHint(attacker.name + " recovered " + manaShift + " mana, and will briefly be able to hold on to more mana than usual!");
        return 1;
    },

    actionMove: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        var requiredStam = 20;
        var difficulty = 6; //Base difficulty, rolls greater than this amount will hit.

        //if (attacker.isEvading) {
        //    windowController.addHint(attacker.name + " stopped trying to avoid melee.");
        //    attacker.isEvading = false; //If you are already evading melee, this will let you stop it without stamina cost or a roll for success.
        //    return 1;
        //}

        if (!battlefield.inGrabRange && !attacker.isRestrained) { //If you were neither grappled nor in grab range, you didn't need to do this.
            windowController.addHint(attacker.name + " was neither grappled nor in grapple range and just wasted a turn.");
            return 1; //Successful attack, if we ever need to check that.
        }

        if (attacker.isRestrained) difficulty += Math.max(2, 6 + Math.floor((target.strength() - attacker.strength()) / 2)); //When grappled, up the difficulty based on the relative strength of the combatants. Minimum of +2 difficulty, maximum of +10.
        if (attacker.isRestrained) difficulty -= attacker.isEscaping; //Then reduce difficulty based on how much effort we've put into escaping so far.
        if (target.isRestrained) difficulty -= 4; //Lower the difficulty considerably if the target is restrained.

        if (attacker.isDisoriented) difficulty += 2; //Up the difficulty if the attacker is dizzy.
        if (target.isDisoriented) difficulty -= 2; //Lower the difficulty if the attacker is dizzy.

        if (attacker.stamina < requiredStam) {	//Not enough stamina-- reduced effect
            difficulty += Math.ceil(((requiredStam - attacker.stamina) / requiredStam)*(20 - difficulty)); // Too tired? You're going to fail.
            windowController.addHint(attacker.name + " was just too tired.");
        }
        attacker.hitStamina(requiredStam); //Now that stamina has been checked, reduce the attacker's stamina by the appopriate amount.

        var attackTable = attacker.buildActionTable(difficulty, target.dexterity(), attacker.dexterity(), attacker.dexterity());
        windowController.addInfo("Dice Roll Required: " + (attackTable.dodge +1));
        var tempGrappleFlag = true;
        if (attacker.isGrappling(target)) { //If you're grappling someone they are freed, regardless of the outcome.
            windowController.addHint(attacker.name + " used ESCAPE. " + target.name + " is no longer being grappled. ");
            target.removeGrappler(attacker);
            tempGrappleFlag = false;
        }

        if (roll <= attackTable.miss) {	//Miss-- no effect.
            windowController.addHit("FAILED! ");
            if (attacker.isRestrained) attacker.isEscaping += 6;//If we fail to escape, it'll be easier next time.
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.dodge && target.canDodge(attacker)) {	//Dodged-- no effect.
            windowController.addHit(target.name + " WAS TOO QUICK! ");
            windowController.addHint(attacker.name + " failed. " + target.name + " was just too quick for them.");
            if (attacker.isRestrained) attacker.isEscaping += 6;//If we fail to escape, it'll be easier next time.
            return 0; //Failed attack, if we ever need to check that.
        }

        if (roll <= attackTable.glancing && target.canDodge(attacker)) { //Glancing blow-- reduced damage/effect, typically half normal.
            windowController.addHit(" CLOSE CALL! ");
            windowController.addHint(attacker.name + " succeeded, but it was a close call, and cost them more stamina than usual. ");
            attacker.hitStamina(10);
        } else if (roll >= attackTable.crit) { //Critical Hit-- increased damage/effect, typically 3x damage if there are no other bonuses.
            windowController.addHit(" CRITICAL SUCCESS! ");
            windowController.addHint(attacker.name + " succeeded, and they were so quick they even had a moment to rest afterward.");
            windowController.addHint(attacker.name + " recovered (10) Stamina!");
            attacker.addStamina(10);
        }

        //if (target.isEvading) { //If the target is evading melee, this becomes pursue.
        //    target.isEvading = false;
        //    attacker.isEvading = false;
        //    windowController.addHint(attacker.name + " closed the distance between them and " + target.name + ", and is now in melee with them.");
        //    return 1; //Successful attack, if we ever need to check that.
        //}

        if (target.isGrappling(attacker)) { //If you were being grappled, you get free.
            windowController.addHint(attacker.name + " escaped " + target.name + "'s hold! ");
            attacker.removeGrappler(target);
            tempGrappleFlag = false;
        }

        if (battlefield.inGrabRange) {
            windowController.addHit(attacker.name + " moved away!");
            battlefield.inGrabRange = false;
            windowController.addHint(attacker.name + " managed to put some distance between them and " + target.name + " and is now out of grabbing range.");
        }

        //if (tempGrappleFlag) { //If you weren't grappling or being grappled but you were in grapple range, move out of grapple range.
        //
        ////    windowController.addHint(attacker.name + " managed to put some distance between them and " + target.name + ". " + attacker.name + " is now actively evading melee, at the cost of their normal stamina regen.");
        ////    attacker.isEvading = true;
        //}
        return 1; //Successful attack, if we ever need to check that.
    },

    actionDefensive: function (roll) {
        var attacker = this;
        var target = battlefield.getTarget();
        //var requiredStam = 20;
        //var difficulty = 6; //Base difficulty, rolls greater than this amount will hit.
        
        
        if (attacker.isRestrained || target.isRestrained) {
            windowController.addHint("You can't fight defensively while grappling!");
            return 0
        }
        
        if (attacker.isEvading) {
            attacker.isEvading = false;
            windowController.addHint(attacker.name + " stopped fighting defensively.");
        } else {
            attacker.isEvading = true;
            windowController.addHint(attacker.name + " started fighting defensively (+2 defense, -2 attack).");
        }
        
        if (!target.isStunned) {
            target.isStunned = true;//The action activates the stance, but you can still use an action.
            windowController.addHint(attacker.name + " can perform another action.");
        }
        
        return 1; //Successful attack, if we ever need to check that.
    },

    actionFumble: function (action) {
        var attacker = this;

        //if (attacker.isEvading && action == "Escape") {
        //    attacker.isEvading = false; //If you are already evading melee, this will let you stop it without stamina cost or a roll for success.
        //    return 1;
        //}

        switch (action) {
            case "Light":
                attacker.hitStamina(15);
                break;
            case "Heavy":
                attacker.hitStamina(30);
                attacker.isExposed += 2; //If the fighter misses a big attack, it leaves them open and they have to recover balance which gives the opponent a chance to strike.
                windowController.addHint(attacker.name + " was left wide open by the failed attack and " + battlefield.getTarget().name + " has the opportunity to grab them!");
                break;
            case "Grab":
                attacker.hitStamina(20);
                break;
            case "Tackle":
                attacker.hitStamina(30);
                battlefield.inGrabRange = true; //Even a failed tackle still brings the fighters together.
                break;
            case "Ranged":
                attacker.hitStamina(25);
                break;
            case "Magic":
                attacker.hitMana(20);
                break;
            case "Hex":
                attacker.hitMana(10);
                break;
            case "Escape":
                attacker.hitStamina(20);
                break;
            case "Skip/Rest":
                windowController.addHint(attacker.name + " could not calm their nerves.");
                break;
            case "Defensive":
                windowController.addHint(attacker.name + " could not focus on defense.");
                break;
        }

        windowController.addHit(" FUMBLE! ");
    },

    canDodge: function (attacker) {
        return !(this.isGrappling(attacker) || this.isGrappledBy.length != 0);
    },

    isGrappling: function (target) {
        return target.isGrappledBy.indexOf(this.name) != -1;
    },

    removeGrappler: function (target) {
        var grappleIndex = this.isGrappledBy.indexOf(target.name);
        this.isGrappledBy.splice(grappleIndex, 1);
    }
};

//----------------------------------------------------------------------------------
// One time events (Setting the default visibility of panels, for example)
// Objects and variables not tied to a particular event
//----------------------------------------------------------------------------------
//windowController.switchToPanel("Setup"); //Currently we start out on the form used to setup a fight, need to add an instructions panel at some point before v1.0
var battlefield = new arena(); //Create an arena named battlefield. It's important that this object is *outside* of the scope of any particular event function so that all event functions may access it.

//----------------------------------------------------------------------------------
// Event Handlers
//----------------------------------------------------------------------------------

// Catch any changes to Endurance or Spellpower and alter the current/maximum HP or Mana to match.

//TODO: Check if necessary or not
//$( "fieldset[id^=Fighter]" ).each( function() {
//	windowController.calcFormHP( $(this).find("input[name=Endurance]")[0] );
//	$(this).find("input[name=Endurance]").change( function( event ) { windowController.calcFormHP( this ); });
//
//	windowController.calcFormMana( $(this).find("input[name=Willpower]")[0] );
//	$(this).find("input[name=Willpower]").change( function( event ) { windowController.calcFormMana( this ); });
//});

// Mouseover tooltip events
//$( windowController.getRolloverKeys().join(", ") ).mouseenter(function() {
//	windowController.setToolTip( $(this).attr("name") );
//	// console.log( windowController.rollovers[$(this).attr("name")] );
//});

// Take input from the setup form, add fighters to the arena, and then switch to the next panel.
function initialSetup(firstFighterSettings, secondFighterSettings, arenaSettings) {
    //event.preventDefault();

    // Get the global settings from the fieldset Arena
    var defaultArenaSettings = {};
    defaultArenaSettings["StatPoints"] = 20;
    defaultArenaSettings["GameSpeed"] = 1;
    defaultArenaSettings["DisorientedAt"] = 40;
    defaultArenaSettings["UnconsciousAt"] = 0;
    defaultArenaSettings["DeadAt"] = 0;
    if(arenaSettings == undefined){
        arenaSettings = defaultArenaSettings;
    }
    battlefield.setGlobalFighterSettings(arenaSettings);

    // Clear the list of Fighters (just in case) and then get each fighters settings from the FighterN fieldsets. Any number of fighters could potentially be added, but currently the UI is only set up to allow two.
    battlefield.clearFighters();
    var fighterSettings = [];
    var fighterOne = {};
    fighterOne["Name"] = firstFighterSettings.name;
    fighterOne["Strength"] = parseInt(firstFighterSettings.strength);
    fighterOne["Dexterity"] = parseInt(firstFighterSettings.dexterity);
    fighterOne["Endurance"] = parseInt(firstFighterSettings.endurance);
    fighterOne["Spellpower"] = parseInt(firstFighterSettings.spellpower);
    fighterOne["Willpower"] = parseInt(firstFighterSettings.willpower);
    fighterOne["HP"] = parseInt(firstFighterSettings.hp);
    fighterOne["Mana"] = parseInt(firstFighterSettings.mana);
    fighterOne["Stamina"] = parseInt(firstFighterSettings.stamina);
    fighterOne["Cloth"] = parseInt(firstFighterSettings.cloth);

    var fighterTwo = {};
    fighterTwo["Name"] = secondFighterSettings.name;
    fighterTwo["Strength"] = parseInt(secondFighterSettings.strength);
    fighterTwo["Dexterity"] = parseInt(secondFighterSettings.dexterity);
    fighterTwo["Endurance"] = parseInt(secondFighterSettings.endurance);
    fighterTwo["Spellpower"] = parseInt(secondFighterSettings.spellpower);
    fighterTwo["Willpower"] = parseInt(secondFighterSettings.willpower);
    fighterTwo["HP"] = parseInt(secondFighterSettings.hp);
    fighterTwo["Mana"] = parseInt(secondFighterSettings.mana);
    fighterTwo["Stamina"] = parseInt(secondFighterSettings.stamina);
    fighterTwo["Cloth"] = parseInt(secondFighterSettings.cloth);

    fighterSettings.push(fighterOne);
    fighterSettings.push(fighterTwo);

    // Check and make sure there weren't any problems with the fighter settings that might have thrown an error.
    var fightersAdded = 0;
    for (var i = 0, len = fighterSettings.length; i < len; i++) {
        fightersAdded += battlefield.addFighter(fighterSettings[i]);
    }

    // And move on to the gameplay screen if there weren't errors.
    if (fightersAdded == fighterSettings.length) {
        battlefield.pickInitialActor();
        //windowController.nextPanel();
        windowController.addHit("Game started!");
        windowController.addHit("FIGHTING STAGE: " + battlefield.stage + " - " + battlefield.getActor().name + " goes first!");
        battlefield.outputFighterStatus(); // Creates the fighter status blocks (HP/Mana/Stamina/Cloth)
        battlefield.outputFighterStats(); // Creates the fighter stat blocks (STR/DEX/END/INT/WIL)
        windowController.addInfo("[url=http://www.f-list.net/c/rendezvous%20fight/]Visit this page for stage descriptions[/url]");
        windowController.addInfo("[url=https://github.com/Barrodin/RF_Fight_Test/]Visit this page for patch notes[/url]");
    }

    // Either way, update the output (which will display errors if there were any and post the battle start text to the gameplay screen).
    windowController.updateOutput();
};

//Take input from the gameplay/combat form, provide the appropriate results, and run end of turn regen/cleanup.
function combatInput(actionMade) {
    //event.preventDefault();
    var action = actionMade;
    if (typeof action === 'undefined') return;
    var actor = battlefield.getActor();
    var roll = rollDice([20]);
    while(actor.lastRolls.indexOf(roll) != -1){
        roll = rollDice([20]);
    }
    actor.lastRolls.push(roll);
    if(actor.lastRolls.length > 3){
        actor.lastRolls.pop();
    }
    var luck = 0; //Actor's average roll of the fight.
    
    windowController.addAction(action);
    
    // Update tracked sum of all rolls and number of rolls the actor has made. Then calculate average value of actor's rolls in this fight.
    actor.rollTotal += roll;
    actor.rollsMade += 1;
    if (actor.rollsMade > 0) { luck = Math.round(actor.rollTotal / actor.rollsMade) };// Safety feature so we don't divide by zero. We shouldn't really need it, but just in case.
        
    
    // Fumble on a bad roll, act on a good roll. Each attack deteremines its own method of resolving hits vs. misses.
    if (roll > 1) {
        actor["action" + action](roll);
    } else {
        actor.actionFumble(action);
    }

    windowController.addInfo("Raw Dice Roll: " + roll);
    windowController.addInfo(actor.name + "'s Average Dice Roll: " + luck);

    battlefield.turnUpkeep(); //End of turn upkeep (Stamina regen, check for being stunned/knocked out, etc.)
    battlefield.outputFighterStatus(); // Creates the fighter status blocks (HP/Mana/Stamina/Cloth)
    //battlefield.outputFighterStats();
    windowController.updateOutput(); //Tells the window controller to format and dump all the queued up messages to the results screen.
};
