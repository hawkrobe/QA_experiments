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
  submitInfoAndClose()
};

submitInfoAndClose = function() {
    // Redirect to exit survey
  console.log("server booted")      
  game.viewport.style.display="none";
  $('#exit_survey').show()
}

// This gets called when someone selects something in the menu
dropdownTip = function(data){
  console.log(data)
  var commands = data.split('::')
  switch(commands[0]) {
    case 'human' :
      $('#humanResult').show()
      game.data.subj_data = _.extend(game.data.subj_data, {'thinksHuman' : commands[1]}); break;
    case 'language' :
      game.data.subj_data = _.extend(game.data.subj_data, {'nativeEnglish' : commands[1]}); break;
    case 'submit' :
      game.data.subj_data = _.extend(game.data.subj_data, {'comments' : $('#comments').val(), 'role' : my_role}); 
      var urlParams;
      var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = location.search.substring(1);

      urlParams = {};
      while (match = search.exec(query))
        urlParams[decode(match[1])] = decode(match[2]);
	
      if(_.size(urlParams) == 4) {
	window.opener.turk.submit(game.data, true)
	window.close(); 
      } else {
	console.log("would have submitted the following :")
	console.log(game.data);
	// var URL = 'http://web.stanford.edu/~rxdh/psych254/replication_project/forms/end.html?id=' + my_id;
	// window.location.replace(URL);
      }
      break;
  }
}

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

    game.goalNum = data.goalNum;
    game.phase = data.phase
    game.game_started = data.gs;
    game.players_threshold = data.pt;
    game.player_count = data.pc;
    game.wheel = data.wheel;
    game.data = data.dataObj

    console.log(game.wheel)

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
    var possibleXVals = _.map(data.goals,
        function(e){return e.trueX})

    // If your objects are out-of-date (i.e. if there's a new round), update them
    if (!_.isEqual(dataNames, localNames)) { 
        game.goals = _.map(_.zip(data.goals, _.shuffle(_.range(4))), function(pair) {
            var obj = pair[0]
            var i = pair[1]
            var imgObj = new Image()
            imgObj.src = obj.url

            var adjustment = my_role == "helper" ? game.halfwayPoint * 2 : 0
	  
            // Set it up to load properly (also randomize positioning of )
            var x = parseInt(obj.trueX) + adjustment
            var y = parseInt(obj.trueY)

            imgObj.onload = function(){
                if(my_role === "helper") {
                    game.ctx.drawImage(imgObj, x, y, obj.width, obj.height)
                }
                drawScreen(game, game.get_player(my_id))
            }
            return _.extend(_.omit(obj, ['trueX', 'trueY']),
                {img: imgObj, trueX : x, trueY : y})
        })
    }

    game.words = _.map(data.words, function (word) {
        game.ctx.font = "24pt Helvetica";
        var newWord = _.clone(word)
        newWord.width = game.ctx.measureText(word.content).width;
        newWord.height = game.ratio * 20
        return newWord
    })

    makeDrawableObjects(game)

    initializeWords(
        game, game.get_player(my_id), game.questionBox.tlX + game.ratio * 5,
        game.questionBox.tlY + game.questionBox.height - game.sendQuestionButton.height*2.5,
        game.questionBox.width, game.ratio * 30);

    $('#instructs').html("<h3>Round " + (data.roundNum + 1) + " of " 
			 + data.numRounds + "</h3>")

    // Draw all this new stuff
    if(data.players.length > 1) {
        game.goal = game.goals[game.goalNum]
        game.get_player(my_id).message = ""
        game.ctx.fillStyle = "#212121";
        game.ctx.fillRect(0,0,game.viewport.width-1,game.viewport.height-1);
      drawScreen(game, game.get_player(my_id))
        if(my_role == "guesser") {
            resetWheel(game)
            setTimeout(function() {startSpin(game)}, 1000)
        }
    } else {
      drawScreen(game, game.get_player(my_id))
    }
}; 

var makeDrawableObjects = function(game) {
    // var wordWidth = _.reduce(game.words, function(memo, word) {
    //     return memo + word.width;
    // }, 20)
    var wordWidth = 650
    game.questionBox = {
        tlX : game.halfwayPoint + (game.viewport.width - wordWidth)/2, 
        tlY: 375*game.ratio, 
        height: 175*game.ratio, width: wordWidth}

    var revealWidth = 200
    game.revealBox = {
        tlX : game.halfwayPoint + (game.viewport.width - revealWidth)/2, 
        tlY: 225*game.ratio, 
        height: revealWidth, width: revealWidth}

    game.answerLine = {
        startX : game.questionBox.tlX + 150*game.ratio, 
        endX   : game.questionBox.tlX + game.questionBox.width - 50*game.ratio,
        y      : game.questionBox.tlY + game.questionBox.height/2}

    game.sendQuestionButton = {
        width: game.questionBox.width/4,
        height: game.questionBox.height*1/8,
        tlX: game.questionBox.tlX + game.questionBox.width*3/8,
        tlY: game.questionBox.tlY + game.questionBox.height*7/8 - 2*game.ratio,
    }
}
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
	  submitInfoAndClose();
          console.log("received end message...")
	  break;

        case 'alert' : // Not in database, so you can't play...
            alert('You did not enter an ID'); 
            window.location.replace('http://nodejs.org'); break;

        case 'join' : //join a game requested
            var num_players = commanddata;
            client_onjoingame(num_players, commands[3]); break;

        case 'newPhase' :
            game.phase += 1
            console.log("phase is now...", game.phase)
            drawScreen(game, game.get_player(my_id)); 
            break;

        case 'gateDrop' :
            var obj = game.goals[commanddata]
            game.gateSelected = commanddata
            game.ctx.drawImage(obj.img, game.revealBox.tlX, game.revealBox.tlY, 
                obj.width, obj.height);
            game.ctx.drawImage(obj.img, obj.trueX + (game.halfwayPoint * 2), obj.trueY,
                obj.width, obj.height);break;
        case 'reveal' :
            game.gatePicked = commanddata
            console.log("gatePicked:", game.gatePicked)
            revealAnswer(game, game.get_player(my_id)); 
            break;

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

var numWordsOnLine = function(){
    qsOnLine = []
    for(var i = 0; i < game.words.length; i++) {
        var word = game.words[i];
        if(word.onLine) {
            qsOnLine = qsOnLine.concat([{content: word.content, xVal : word.trueX}])
        }
    }
    return qsOnLine.length
}

var readQuestion = function(){
    qsOnLine = []
    for(var i = 0; i < game.words.length; i++) {
        var word = game.words[i];
        if(word.onLine) {
            qsOnLine = qsOnLine.concat([{content: word.content, xVal : word.trueX}])
        }
    }
    return _.pluck(_.sortBy(qsOnLine, 'xVal'), 'content').join(" ")
}

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
    game.viewport.width = game.world.width * game.ratio;
    game.viewport.height = game.world.height * game.ratio;

    //Fetch the rendering contexts
    game.ctx = game.viewport.getContext('2d');
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

  game.socket.on('updateData', function(data){
    console.log(data)
    game.data = data;
  })

    // Draw objects when someone else moves them
    game.socket.on('objMove', function(data){
        var obj = data.type == "word" ? game.words[data.i] : game.goals[data.i]
        if(data.type == "word") {
            obj.trueX = parseInt(data.x);
            obj.trueY = parseInt(data.y);
        }
        drawScreen(game, game.get_player(my_id))

        if(data.type == "gate" && my_role == "guesser") {
          game.ctx.lineWidth = 1
          game.ctx.strokeStyle = "white"
          game.ctx.setLineDash([6]);

          game.ctx.strokeRect(data.x, data.y, obj.width, obj.height)
          game.ctx.setLineDash([0]);
        }
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

    // set role locally
    my_role = role;
    game.get_player(my_id).role = my_role;
    var adjustment = role == "guesser" ? game.halfwayPoint * 2 : 0
    game.get_player(my_id).gateXLocs = _.range(adjustment + 100 * game.ratio,
      adjustment + 600 * game.ratio ,
      125 * game.ratio)
    game.get_player(my_id).questionBoxAdjustment = 0//my_role === "guesser" ? game.ratio * 75 : 0;

    // Update header w/ role 
    $('#header').append(role + '.');
    if(role === "guesser") {
        $('#instructs').html("<p>Round 0 of 12</p>")
    } else {
        drawMysteryGates(game, game.get_player(my_id));
        $('#instructs').html("Round 0 of 12")
    }

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
    //find which shape was clicked
    if(my_role === "guesser" && game.phase == 1) {
        for (i=0; i < game.words.length; i++) {
            if  (wordHitTest(game.words[i], mouseX, mouseY)) {
                dragging = "word";
                if (i > highestIndex) {
                    //We will pay attention to the point on the object where the mouse is "holding" the object:
                    game.words[i].onLine = false
                    dragHoldX = mouseX - game.words[i].trueX;
                    dragHoldY = mouseY - game.words[i].trueY;
                    highestIndex = i;
                    dragIndex = i;
                }
            }
        }
    }
    else if (my_role === "helper" && game.phase == 2) {
        for (i=0; i < game.goals.length; i++) {
            if (gateHitTest(i, mouseX, mouseY)) {
                console.log("hit!")
                dragging = "gate";
                if (i > highestIndex) {
                    //We will pay attention to the point on the object where the mouse is "holding" the object:
                    dragHoldX = mouseX - game.goals[i].trueX;
                    dragHoldY = mouseY - game.goals[i].trueY;
                    highestIndex = i;
                    dragIndex = i;
                }
            }
        }

    }
    checkForHit(mouseX, mouseY)

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
    if (dragging== "word") {
        // Set up the right variables
        var bRect = game.viewport.getBoundingClientRect();
        dropX = (evt.clientX - bRect.left)*(game.viewport.width/bRect.width);
        dropY = (evt.clientY - bRect.top)*(game.viewport.height/bRect.height);
        var word = game.words[dragIndex]
        
        // If you were dragging the correct object... And dragged it to the correct location...
        console.log(numWordsOnLine())
        if (dropY < game.answerLine.y && numWordsOnLine() == 0) {
            word.trueY = game.answerLine.y - word.height
            word.onLine = true;
            removeOverlap(word);
        } else {
            if(numWordsOnLine() > 0)
                showError();
            word.trueY = word.origY;
            word.trueX = word.origX;
            word.onLine = false;
        }

        game.socket.send("objMove." + dragging + "." + dragIndex 
            + "." + Math.round(word.trueX - game.get_player(my_id).questionBoxAdjustment) 
            + "." + Math.round(word.trueY))

        game.socket.send("dropWord." + word.content
            + "." + word.onLine)
    } else if(dragging == "gate") {
        var bRect = game.viewport.getBoundingClientRect();
        dropX = (evt.clientX - bRect.left)*(game.viewport.width/bRect.width);
        dropY = (evt.clientY - bRect.top)*(game.viewport.height/bRect.height);
        var gate = game.goals[dragIndex]

        if( dropY > game.revealBox.tlY && dropY < game.revealBox.tlY + game.revealBox.height
            && dropX > game.revealBox.tlX && dropX < game.revealBox.tlX + game.revealBox.width) {
            gate.trueY = game.revealBox.tlY;
            gate.trueX = game.revealBox.tlX;
            game.gateSelected = dragIndex;
        } else {
            gate.trueY = gate.origY;
            gate.trueX = gate.origX;
        }

        game.socket.send("objMove." + dragging + "." + dragIndex 
            + "." + Math.round(gate.trueX - game.get_player(my_id).questionBoxAdjustment) 
            + "." + Math.round(gate.trueY))
        game.socket.send("dropGate." + game.gateSelected)
        game.socket.send("advance." + "The " + game.goals[game.gateSelected].name + " is behind gate " + (game.gateSelected + 1)) 
        game.gateSelected = false
    }
    drawScreen(game, game.get_player(my_id))
    dragging = false;
    window.removeEventListener("mousemove", mouseMoveListener, false);
}

function checkForHit (mouseX, mouseY) {
    if(my_role === "guesser" && game.phase == 1) {
        if(buttonHitTest(mouseX, mouseY)) {
            if(numWordsOnLine() == 0) {
                showError()
            } else {
                var question = readQuestion();
                game.socket.send("advance." + question.trim() + "   ?") 
            }
        }           
    // } else if (my_role === "helper" && game.phase == 2) {
    //     for (i=0; i < game.goals.length; i++) {
    //         if(gateHitTest(i, mouseX, mouseY)) {
    //             highlightGate(i, game.gateSelected);
    //             game.gateSelected = i;
    //         }
    //     }
    //     if(buttonHitTest(mouseX, mouseY) && _.isNumber(game.gateSelected)) {
    //         console.log("in here!!!!")
    //         console.log(game.gateSelected)
    //         game.socket.send("advance." + "The " + game.goals[game.gateSelected].name + " is behind gate " + (game.gateSelected + 1)) 
    //         game.gateSelected = false
    //     }
    } else if (my_role === "guesser" && game.phase == 3) {
        for (i=0; i < game.goals.length; i++) {
            if(mysteryGateHitTest(i, mouseX, mouseY)) {
                game.socket.send("advance.." + i)
            }
        }
    }
}

function showError () {
    game.ctx.fillStyle = "red"
    game.ctx.fillText("You must pick exactly one word to describe the object!",
        game.questionBox.tlX + game.questionBox.width/2, 
        game.questionBox.tlY + game.questionBox.height + 30)

}

function removeOverlap (origWord) {
    qsOnLine = []
    for(var i = 0; i < game.words.length; i++) {
        var word = game.words[i];
        if(word.onLine) {
            qsOnLine = qsOnLine.concat(word)
        }
    }
    var sortedWords = _.sortBy(qsOnLine, 'trueX')
    var myIndex = _.indexOf(sortedWords, origWord)
    var leftNeighbor = sortedWords[myIndex - 1]
    var rightNeighbor = sortedWords[myIndex + 1]
    if( leftNeighbor ) {
        var diff = (leftNeighbor.trueX + leftNeighbor.width) - (origWord.trueX)
        if( diff > 0) {
            leftNeighbor.trueX -= (diff > 0) ? diff : 0
            game.socket.send("objMove.word." + _.indexOf(game.words, leftNeighbor)
                + "." + Math.round(leftNeighbor.trueX - game.get_player(my_id).questionBoxAdjustment) 
                + "." + Math.round(leftNeighbor.trueY))
            removeOverlap(leftNeighbor)
        }
    }
    if ( rightNeighbor ) {
        var diff = (origWord.trueX + origWord.width) - (rightNeighbor.trueX) 
        if (diff > 0) {
            rightNeighbor.trueX += (diff > 0) ? diff : 0
            game.socket.send("objMove.word." + _.indexOf(game.words, rightNeighbor)
                + "." + Math.round(rightNeighbor.trueX - game.get_player(my_id).questionBoxAdjustment) 
                + "." + Math.round(rightNeighbor.trueY))
            removeOverlap(rightNeighbor)
        }
    }

}

function mouseMoveListener(evt) {
    if (dragging == "word") {
        // prevent from dragging offscreen
        var minX = game.questionBox.tlX + game.get_player(my_id).questionBoxAdjustment;
        var maxX = game.questionBox.tlX + game.questionBox.width - game.words[dragIndex].width + game.get_player(my_id).questionBoxAdjustment;
        var minY = game.questionBox.tlY;
        var maxY = game.questionBox.tlY + game.questionBox.height - game.words[dragIndex].height;
    } else if (dragging == "gate") {
        var minX = game.halfwayPoint * 2
        var maxX = game.viewport.width
        var minY = 0
        var maxY = game.viewport.height
    }
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
    var obj = dragging == "word" ? game.words[dragIndex] : game.goals[dragIndex]
    obj.trueX = Math.round(posX);
    obj.trueY = Math.round(posY);

    // Tell server about it
    game.socket.send("objMove." + dragging + "." + dragIndex 
        + "." + Math.round(posX - game.get_player(my_id).questionBoxAdjustment) 
        + "." + Math.round(posY))
    drawScreen(game, game.get_player(my_id));
}

function wordHitTest(shape,mx,my) {
    var dx = mx - shape.trueX;
    var dy = my - shape.trueY;
    return (0 < dx) && (dx < shape.width) && (0 < dy) && (dy < shape.height)
}

function buttonHitTest(mx,my) {
    console.log("buttonHit Test")
    var dx = mx - game.sendQuestionButton.tlX - game.get_player(my_id).questionBoxAdjustment;
    var dy = my - game.sendQuestionButton.tlY;
    console.log([dx, dy])
    return (0 < dx) && (dx < game.sendQuestionButton.width) && (0 < dy) && (dy < game.sendQuestionButton.height)
}

function gateHitTest(i, mx, my) {
  var xLocs1 = _.map(game.get_player(my_id).gateXLocs,
		     function(n) {return n + game.halfwayPoint * 2})
  var dx1 = mx - (xLocs1[i] - 100);
    // allow people to click on either view... but not in between!
  var dy = my - game.ratio * 100 + 100
  return (0 < dy) && (dy < 200) && (((0 < dx1) && (dx1 < 200)))
}

function mysteryGateHitTest(i, mx, my) {
    var adjustment = my_role == "guesser" ? game.halfwayPoint * 2 : 0
    var xLocs = _.range(adjustment + 100 * game.ratio,
			adjustment + 600 * game.ratio , 125 * game.ratio)
    var dx = mx - (xLocs[i] - 100);
    // allow people to click on either view... but not in between!
    var dy = my - game.ratio * 50
    return (0 < dx) && (dx < 200) && (0 < dy) && (dy < 200)
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
