/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/

//require('look').start()

    var
        use_db      = false,
        game_server = module.exports = { games : {}, game_count:0, assignment:0},
        fs          = require('fs');
	    
    if (use_db) {
	    database    = require(__dirname + "/database"),
	    connection  = database.getConnection();
    }

global.window = global.document = global;
require('./game.core.js');
utils = require('./utils.js');

var moveObject = function(client, i, x, y) {
    var obj = client.game.gamecore.objects[i]
    var others = client.game.gamecore.get_others(client.userid);
    obj.trueX = parseInt(x)
    obj.trueY = parseInt(y)
    _.map(others, function(p) {
      p.player.instance.emit('objMove', {i: i, x: x, y: y})
  })
}

// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
game_server.server_onMessage = function(client,message) {
//    console.log("received message: " + message)
    //Cut the message up into sub components
    var message_parts = message.split('.');

    //The first is always the type of message
    var message_type = message_parts[0];

    //Extract important variables
    var gc = client.game.gamecore
    var id = gc.instance.id.slice(0,6)
    var all = gc.get_active_players();
    var target = gc.get_player(client.userid);
    var others = gc.get_others(client.userid);
    switch(message_type) {
        case 'objMove' :    // Client is changing angle
            moveObject(client, message_parts[1], message_parts[2], message_parts[3])
            break;

        case 'chatMessage' :
            //write data to file
            // if(client.game.player_count == 2 && !gc.paused) 
            //     writeData(client, "message", message_parts)
            // Update others
            var msg = message_parts[2].replace(/-/g,'.')
            _.map(all, function(p){
                p.player.instance.emit( 'chatMessage', {user: client.userid, msg: msg})})
            break;

        case 'h' : // Receive message when browser focus shifts
            target.visible = message_parts[1];
            break;
        }
};

// var writeData = function(client, type, message_parts) {
//     var gc = client.game.gamecore
//     var attemptNum = gc.attemptNum;
//     var condition = gc.item.condition
//     var objectSet = gc.item.objectSet
//     var instructionNum = gc.instructionNum
//     var object_name = gc.instructions[gc.instructionNum].split(' ')[0]
//     var object = _.find(gc.objects, function(obj) { return obj.name == object_name })
//     var critical = object.critical === "filler" ? 0 : 1
//     var id = gc.instance.id.slice(0,6)
//     switch(type) {
//         case "mouse" :
//             var date = message_parts[1]
//             var x = message_parts[2]
//             var y = message_parts[3]
//             if(object.critical === "filler") {
//                 var distractorX = "none"
//                 var distractorY = "none"
//             } else {
//                 var distractor = _.find(gc.objects, function(obj) { return obj.critical == "distractor" })
//                 var distractorX = distractor.trueX + distractor.width/2
//                 var distractorY = distractor.trueY + distractor.height/2
//             }

//             var objX = object.trueX + object.width/2
//             var objY = object.trueY + object.height/2

//             var line = String(id + ',' + date + ',' + condition + ',' + critical + ',' + 
//                 objectSet + ',' + instructionNum + ',' + attemptNum + ',' + objX + ',' + objY + ',' +
//                 distractorX + ',' + distractorY + ',' + x + ',' + y ) + "\n"
//             console.log("mouse:" + line)
//             gc.mouseDataStream.write(line, function (err) {if(err) throw err;}); 
//             break;
//         case "message" :
//             var date = message_parts[1]
//             var msg = message_parts[2].replace(/-/g,'.')
//             var line = (id + ',' + date + ',' + condition + ',' + critical + ',' +
//                 objectSet + ',' + instructionNum + ',' + attemptNum + ',' + client.role + ',"' + msg + '"\n')
//             console.log("message:" + line)
//             gc.messageStream.write(line);
//             break;
//         case "error" :
//             var trueItem = gc.instructions[gc.instructionNum].split(' ')[0]
//             var line = (id + ',' + String(message_parts[6]) + ',' + condition + ',' 
//                         + critical + ',' + objectSet + ',' + instructionNum + ',' 
//                         + attemptNum + ',' +trueItem + ',' 
//                         + gc.objects[message_parts[1]].name + ','
//                         + parseInt(gc.currentDestination[0]) + ',' 
//                         + parseInt(gc.currentDestination[1]) + ','
//                         + parseInt(message_parts[4]) + ',' + parseInt(message_parts[5]) + '\n')
//             console.log("incorrect: ", line);
//             gc.errorStream.write(line)
//             break;
//     }
// }

/* 
   The following functions should not need to be modified for most purposes
*/

// This is the important function that pairs people up into 'rooms'
// all independent of one another.
game_server.findGame = function(player) {
    this.log('looking for a game. We have : ' + this.game_count);
    //if there are any games created, add this player to it!
    if(this.game_count) {
        var joined_a_game = false;
        for (var gameid in this.games) {
            if(!this.games.hasOwnProperty(gameid)) continue;
            var game = this.games[gameid];
            var gamecore = game.gamecore;
            if(game.player_count < gamecore.players_threshold) { 
                joined_a_game = true;
                
                // player instances are array of actual client handles
                game.player_instances.push({
                    id: player.userid, 
                    player: player
                });
                game.player_count++;
                
                // players are array of player objects
                game.gamecore.players.push({
                    id: player.userid, 
                    player: new game_player(gamecore,player)
                });

                this.fileSetup(game)
                // Attach game to player so server can look at it later
                player.game = game;
                player.role = 'helper';

                // notify new player that they're joining game
                player.send('s.join.' + gamecore.players.length + '.' + player.role)

                // notify existing players that someone new is joining
                _.map(gamecore.get_others(player.userid), 
                    function(p){p.player.instance.send( 's.add_player.' + player.userid)})
                gamecore.newRound()

                gamecore.server_send_update()

                gamecore.player_count = game.player_count;
            }
        }
        if(!joined_a_game) { // if we didn't join a game, we must create one
            this.createGame(player);
        }
    } else { 
        //no games? create one!
        this.createGame(player);
    }
}; 

game_server.fileSetup = function(game) {
    // Establish write streams
    var d = new Date();
    var start_time = d.getFullYear() + '-' + d.getMonth() + 1 + '-' + d.getDate() + '-' + d.getHours() + '-' + d.getMinutes() + '-' + d.getSeconds() + '-' + d.getMilliseconds()
    var name = start_time + '_' + game.id;
    // var mouse_f = "data/mouse/" + name + ".csv"
    // fs.writeFile(mouse_f, "gameid, time, condition, critical, objectSet, instructionNum, attemptNum, targetX, targetY, distractorX, distractorY, mouseX, mouseY\n", function (err) {if(err) throw err;})
    // game.gamecore.mouseDataStream = fs.createWriteStream(mouse_f, {'flags' : 'a'});

    // var error_f = "data/error/" + name + ".csv"
    // fs.writeFile(error_f, "gameid, time, condition, critical, objectSet, instructionNum, attemptNum, intendedObj, actualObj, intendedX, intendedY, actualX, actualY\n", function (err) {if(err) throw err;})
    // game.gamecore.errorStream = fs.createWriteStream(error_f, {'flags' : 'a'});

    // var message_f = "data/message/" + name + ".csv"
    // fs.writeFile(message_f, "gameid, time, condition, critical, objectSet, instructionNum, attemptNum, sender, contents\n", function (err) {if(err) throw err;})
    // game.gamecore.messageStream = fs.createWriteStream(message_f, {'flags' : 'a'});
}


// Will run when first player connects
game_server.createGame = function(player) {
    var players_threshold = 2

    var d = new Date();
    var start_time = d.getFullYear() + '-' + d.getMonth() + 1 + '-' + d.getDate() + '-' + d.getHours() + '-' + d.getMinutes() + '-' + d.getSeconds() + '-' + d.getMilliseconds()
    var gameID = utils.UUID();

    var name = start_time + '_' + gameID;
    
    //Create a new game instance
    var game = {
	//generate a new id for the game
        id : gameID,           
	//store list of players in the game
        player_instances: [{id: player.userid, player: player}],
	//for simple checking of state
        player_count: 1             
    };
    
    //Create a new game core instance (defined in game.core.js)
    game.gamecore = new game_core(game);

    // Tell the game about its own id
    game.gamecore.game_id = gameID;
    game.gamecore.players_threshold = players_threshold
    game.gamecore.player_count = 1
    
    // assign role
    player.game = game;
    player.role = 'guesser';
    player.send('s.join.' + game.gamecore.players.length + '.' + player.role)
    this.log('player ' + player.userid + ' created a game with id ' + player.game.id);

    // add to game collection
    this.games[ game.id ] = game;
    this.game_count++;
    
    game.gamecore.server_send_update()
    return game;
}; 

// we are requesting to kill a game in progress.
// This gets called if someone disconnects
game_server.endGame = function(gameid, userid) {
    var thegame = this.games [ gameid ];
    if(thegame) {
        _.map(thegame.gamecore.get_others(userid), function(p) {
            p.player.instance.send('s.end');})
        delete this.games[gameid];
        this.game_count--;
        this.log('game removed. there are now ' + this.game_count + ' games' );
    } else {
        this.log('that game was not found!');
    }   
}; 

//A simple wrapper for logging so we can toggle it,
//and augment it for clarity.
game_server.log = function() {
    console.log.apply(this,arguments);
};
