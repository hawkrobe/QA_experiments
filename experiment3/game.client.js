/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 
                  2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/

/* 
   THE FOLLOWING FUNCTIONS MAY NEED TO BE CHANGED
*/

// A window global for our game root variable.
var game = {};
// A window global for our id, which we can use to look ourselves up
var my_id = null;
var my_role = null;
// Keeps track of whether player is paying attention...
var visible;
var incorrect;
var dragging;

client_ondisconnect = function(data) {
    // Redirect to exit survey
    console.log("server booted")
    var URL = 'http://web.stanford.edu/~rxdh/psych254/replication_project/forms/end.html?id=' + my_id;
    window.location.replace(URL);
};


/* 
Note: If you add some new variable to your game that must be shared
  across server and client, add it both here and the server_send_update
  function in game.core.js to make sure it syncs 

Explanation: This function is at the center of the problem of
  networking -- everybody has different INSTANCES of the game. The
  server has its own, and both players have theirs too. This can get
  confusing because the server will update a variable, and the variable
  of the same name won't change in the clients (because they have a
  different instance of it). To make sure everybody's on the same page,
  the server regularly sends news about its variables to the clients so
  that they can update their variables to reflect changes.
*/
client_onserverupdate_received = function(data){

    // Update client versions of variables with data received from
    // server_send_update function in game.core.js
    if(data.players) {
        _.map(_.zip(data.players, game.players),
            function(z){
                z[1].id = z[0].id;
            })
    }

    var dataNames = _.map(data.goals, 
        function(e){ return e.name})
    var localNames = _.map(game.goals,
        function(e){return e.name})

    console.log("received update:")
    console.log(data.goals)
    // If your objects are out-of-date (i.e. if there's a new round), update them
    if (!_.isEqual(dataNames, localNames)) { 
        game.goals = _.map(data.goals, function(obj) {
            var imgObj = new Image()
            imgObj.src = obj.url
            // Set it up to load properly
            imgObj.onload = function(){
                game.ctx.drawImage(imgObj, parseInt(obj.trueX), parseInt(obj.trueY), obj.width, obj.height)
                drawScreen(game, game.get_player(my_id))
            }
            return _.extend(_.omit(obj, ['trueX', 'trueY']),
                {img: imgObj, trueX : obj.trueX, trueY : obj.trueY})
        })
    }

    // Update local object positions
    _.map(game.goals, function(obj) {
        data_obj = _.find(data.goals, function(o) {return o.name == obj.name})
        obj.trueX = data_obj.trueX;
        obj.trueY = data_obj.trueY;
    })

    if(data.players.length > 1) 
        game.get_player(my_id).message = ""

    // Get widths of words
    game.words = _.map(data.words, function (word) {
        var newWord = _.clone(word)
        word.width = game.ctx.measureText(word.content).width;
        return word
    })
    game.goalNum = data.goalNum;
    game.game_started = data.gs;
    game.players_threshold = data.pt;
    game.player_count = data.pc;

    // Draw all this new stuff
    console.log(game.words)
    drawScreen(game, game.get_player(my_id))
}; 

// This is where clients parse socket.io messages from the server. If
// you want to add another event (labeled 'x', say), just add another
// case here, then call

//          this.instance.player_host.send("s.x. <data>")

// The corresponding function where the server parses messages from
// clients, look for "server_onMessage" in game.server.js.
client_onMessage = function(data) {

    var commands = data.split('.');
    var command = commands[0];
    var subcommand = commands[1] || null;
    var commanddata = commands[2] || null;

    switch(command) {
    case 's': //server message
        switch(subcommand) {    
        case 'end' :
	       // Redirect to exit survey
          console.log("received end message...")
          var URL = 'http://web.stanford.edu/~rxdh/psych254/replication_project/forms/end.html?id=' + my_id;
          window.location.replace(URL); break;

        case 'alert' : // Not in database, so you can't play...
            alert('You did not enter an ID'); 
            window.location.replace('http://nodejs.org'); break;

        case 'join' : //join a game requested
            var num_players = commanddata;
            client_onjoingame(num_players, commands[3]); break;

        case 'add_player' : // New player joined... Need to add them to our list.
            console.log("adding player" + commanddata)
            if(hidden === 'hidden') {
                flashTitle("GO!")
            }
            game.players.push({id: commanddata, player: new game_player(game)}); break;

        case 'begin_game' :
            client_newgame(); break;

        }
    } 
}; 

// When loading the page, we store references to our
// drawing canvases, and initiate a game instance.
window.onload = function(){
    //Create our game client instance.
    game = new game_core();
    
    //Connect to the socket.io server!
    client_connect_to_server(game);
    
    //Fetch the viewport
    game.viewport = document.getElementById('viewport');
    
    //Adjust its size
    game.viewport.width = game.world.width;
    game.viewport.height = game.world.height;

    //Fetch the rendering contexts
    game.ctx = game.viewport.getContext('2d');

    //Set the draw style for the font
    game.ctx.font = '11px "Helvetica"';

    document.getElementById('chatbox').focus();

};

// Associates callback functions corresponding to different socket messages
client_connect_to_server = function(game) {
    //Store a local reference to our connection to the server
    game.socket = io.connect();

    // Tell server when client types something in the chatbox
    $('form').submit(function(){
        var msg = 'chatMessage.' + Date.now() + '.' + $('#chatbox').val();
        if($('#chatbox').val() != '') {
            game.socket.send(msg);
            $('#chatbox').val('');
            // If you just sent a scripted instruction, get rid of it!
            game.scriptedInstruction = "none";
        }
        return false;
    });

    // Update messages log when other players send chat
    game.socket.on('chatMessage', function(data){
        var otherRole = my_role === "guesser" ? "Helper" : "Guesser"
        var source = data.user === my_id ? "You" : otherRole
        var col = source === "You" ? "#363636" : "#707070"
        $('#messages').append($('<li style="padding: 5px 10px; background: ' + col + '">').text(source + ": " + data.msg));
        $('#messages').stop().animate({
            scrollTop: $("#messages")[0].scrollHeight
        }, 800);
    })

    // Draw objects when someone else moves them
    game.socket.on('objMove', function(data){
        game.objects[data.i].trueX = data.x;
        game.objects[data.i].trueY = data.y;
        drawScreen(game, game.get_player(my_id))
    })

    //When we connect, we are not 'connected' until we have an id
    //and are placed in a game by the server. The server sends us a message for that.
    game.socket.on('connect', function(){}.bind(game));
    //Sent when we are disconnected (network, server down, etc)
    game.socket.on('disconnect', client_ondisconnect.bind(game));
    //Sent each tick of the server simulation. This is our authoritive update
    game.socket.on('onserverupdate', client_onserverupdate_received);
    //Handle when we connect to the server, showing state and storing id's.
    game.socket.on('onconnected', client_onconnected.bind(game));
    //On message from the server, we parse the commands and send it to the handlers
    game.socket.on('message', client_onMessage.bind(game));
}; 

client_onconnected = function(data) {
    //The server responded that we are now in a game. Remember who we are
    my_id = data.id;
    game.players[0].id = my_id;
};

client_onjoingame = function(num_players, role) {
    // Need client to know how many players there are, so they can set up the appropriate data structure
    _.map(_.range(num_players - 1), function(i){
        game.players.unshift({id: null, player: new game_player(game)})});

    // Update header w/ role 
    $('#header').append(role + '.');
    if(role === "guesser") {
        $('#instructs').append("Type instructions for the matcher to move the object in the direction of the arrow!")
    } else {
        $('#instructs').append("Click and drag objects to follow the guesser's instructions.")
    }

    // set role locally
    my_role = role;
    game.get_player(my_id).role = my_role;
    game.get_player(my_id).questionBoxAdjustment = my_role === "guesser" ? 75 : 0;

    // show waiting message for first player
    if(num_players == 1)
        game.get_player(my_id).message = 'Waiting for other player to connect...';

    // set mouse-tracking event handler
    game.viewport.addEventListener("mousedown", mouseDownListener, false);
}; 

/*
MOUSE EVENT LISTENERS
*/

function mouseDownListener(evt) {
    var i;
    //We are going to pay attention to the layering order of the objects so that if a mouse down occurs over more than object,
    //only the topmost one will be dragged.
    var highestIndex = -1;
    
    //getting mouse position correctly, being mindful of resizing that may have occured in the browser:
    var bRect = game.viewport.getBoundingClientRect();
    mouseX = (evt.clientX - bRect.left)*(game.viewport.width/bRect.width);
    mouseY = (evt.clientY - bRect.top)*(game.viewport.height/bRect.height);

    // if waiting flag is active, check if center was clicked
    // if(waiting) {
    //     if((Math.pow(mouseX - game.viewport.width/2, 2) + Math.pow(mouseY - game.viewport.height/2, 2))
    //         <= Math.pow(8, 2)) {
    //         game.get_player(my_id).message = ""
    //         if (incorrect) {
    //             game.socket.send("ready.incorrect")
    //             incorrect = false;
    //         } else {
    //             game.socket.send("ready")
    //         }
    //         waiting = false
    //     }
    //} else {
        //find which shape was clicked
        for (i=0; i < game.objects.length; i++) {
            if  (hitTest(game.objects[i], mouseX, mouseY)) {
                dragging = true;
                if (i > highestIndex) {
                    //We will pay attention to the point on the object where the mouse is "holding" the object:
                    dragHoldX = mouseX - game.objects[i].trueX;
                    dragHoldY = mouseY - game.objects[i].trueY;
                    highestIndex = i;
                    dragIndex = i;
                }
            }
        }
//    }
    if (dragging) {
        window.addEventListener("mousemove", mouseMoveListener, false);
    }
    game.viewport.removeEventListener("mousedown", mouseDownListener, false);
    window.addEventListener("mouseup", mouseUpListener, false);

    //code below prevents the mouse down from having an effect on the main browser window:
    if (evt.preventDefault) {
        evt.preventDefault();
    } //standard
    else if (evt.returnValue) {
        evt.returnValue = false;
    } //older IE
    return false;
}

function mouseUpListener(evt) {    
    game.viewport.addEventListener("mousedown", mouseDownListener, false);
    window.removeEventListener("mouseup", mouseUpListener, false);
    if (dragging) {
        // Set up the right variables
        var bRect = game.viewport.getBoundingClientRect();
        dropX = (evt.clientX - bRect.left)*(game.viewport.width/bRect.width);
        dropY = (evt.clientY - bRect.top)*(game.viewport.height/bRect.height);
        var obj = game.objects[dragIndex]
        var cell = game.getCellFromPixel(dropX, dropY)
        console.log(cell)
        console.log([obj.gridX, obj.gridY])
        
        // If you were dragging the correct object... And dragged it to the correct location...
        if (_.isEqual(obj.name, game.instructions[game.instructionNum].split(' ')[0])
            && _.isEqual(cell, game.currentDestination)) {
            // center it
            obj.gridX = cell[0]
            obj.gridY = cell[1]
            obj.trueX = game.getPixelFromCell(cell[0], cell[1]).centerX - obj.width/2
            obj.trueY = game.getPixelFromCell(cell[0], cell[1]).centerY - obj.height/2
            game.socket.send("correctDrop." + dragIndex + "." + Math.round(obj.trueX) + "." + Math.round(obj.trueY))
        
        // If you didn't drag it beyond cell bounds, snap it back w/o comment
        } else if (obj.gridX == cell[0] && obj.gridY == cell[1]) {
            console.log("here!")
            obj.trueX = game.getPixelFromCell(obj.gridX, obj.gridY).centerX - obj.width/2
            obj.trueY = game.getPixelFromCell(obj.gridX, obj.gridY).centerY - obj.height/2
            game.socket.send("objMove." + dragIndex + "." + Math.round(obj.trueX) + "." + Math.round(obj.trueY))
        
        // If you moved the incorrect object or went to the incorrect location, pause game to readjust mouse
        } else {
            obj.trueX = game.getPixelFromCell(obj.gridX, obj.gridY).centerX - obj.width/2
            obj.trueY = game.getPixelFromCell(obj.gridX, obj.gridY).centerY - obj.height/2
            game.get_player(my_id).message = "Error!"
            game.socket.send("incorrectDrop." + dragIndex + "." + Math.round(obj.trueX) + "." + Math.round(obj.trueY) 
                + "." + cell[0] + "." + cell[1] + "." + Date.now())
        }
        // Tell server where you dropped it
        drawScreen(game, game.get_player(my_id))
        dragging = false;
        window.removeEventListener("mousemove", mouseMoveListener, false);
    }
}

function mouseMoveListener(evt) {
    // prevent from dragging offscreen
    var minX = 25;
    var maxX = game.viewport.width - game.objects[dragIndex].width - 25;
    var minY = 25;
    var maxY = game.viewport.height - game.objects[dragIndex].height - 25;

    //getting mouse position correctly 
    var bRect = game.viewport.getBoundingClientRect();
    mouseX = (evt.clientX - bRect.left)*(game.viewport.width/bRect.width);
    mouseY = (evt.clientY - bRect.top)*(game.viewport.height/bRect.height);

    //clamp x and y positions to prevent object from dragging outside of canvas
    var posX = mouseX - dragHoldX;
    posX = (posX < minX) ? minX : ((posX > maxX) ? maxX : posX);
    var posY = mouseY - dragHoldY;
    posY = (posY < minY) ? minY : ((posY > maxY) ? maxY : posY);

    // Update object locally
    var obj = game.objects[dragIndex]
    obj.trueX = Math.round(posX);
    obj.trueY = Math.round(posY);

    // Tell server about it
    game.socket.send("objMove." + dragIndex + "." + Math.round(posX) + "." + Math.round(posY))
    drawScreen(game, game.get_player(my_id));
}

function hitTest(shape,mx,my) {
    var dx = mx - shape.trueX;
    var dy = my - shape.trueY;
    return (0 < dx) && (dx < shape.width) && (0 < dy) && (dy < shape.height)
}

// Automatically registers whether user has switched tabs...
(function() {
    document.hidden = hidden = "hidden";

    // Standards:
    if (hidden in document)
        document.addEventListener("visibilitychange", onchange);
    else if ((hidden = "mozHidden") in document)
        document.addEventListener("mozvisibilitychange", onchange);
    else if ((hidden = "webkitHidden") in document)
        document.addEventListener("webkitvisibilitychange", onchange);
    else if ((hidden = "msHidden") in document)
        document.addEventListener("msvisibilitychange", onchange);
    // IE 9 and lower:
    else if ('onfocusin' in document)
        document.onfocusin = document.onfocusout = onchange;
    // All others:
    else
        window.onpageshow = window.onpagehide = window.onfocus 
             = window.onblur = onchange;
})();

function onchange (evt) {
    var v = 'visible', h = 'hidden',
    evtMap = { 
        focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h 
    };
    evt = evt || window.event;
    if (evt.type in evtMap) {
        document.body.className = evtMap[evt.type];
    } else {
        document.body.className = evt.target.hidden ? "hidden" : "visible";
    }
    visible = document.body.className;
    game.socket.send("h." + document.body.className);
};

(function () {

    var original = document.title;
    var timeout;

    window.flashTitle = function (newMsg, howManyTimes) {
        function step() {
            document.title = (document.title == original) ? newMsg : original;
            if (visible === "hidden") {
                timeout = setTimeout(step, 500);
            } else {
                document.title = original;
            }
        };
        cancelFlashTitle(timeout);
        step();
    };

    window.cancelFlashTitle = function (timeout) {
        clearTimeout(timeout);
        document.title = original;
    };

}());
