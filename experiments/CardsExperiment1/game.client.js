//   Copyright (c) 2012 Sven "FuzzYspo0N" Bergström,
//                   2013 Robert XD Hawkins

//     written by : http://underscorediscovery.com
//     written for : http://buildnewgames.com/real-time-multiplayer/

//     modified for collective behavior experiments on Amazon Mechanical Turk

//     MIT Licensed.


// /*
//    THE FOLLOWING FUNCTIONS MAY NEED TO BE CHANGED
// */

// A window global for our game root variable.
var globalGame = {};
// Keeps track of whether player is paying attention...
var incorrect;
var dragging;
var waiting;

//test: let's try a variable selecting, for when the listener selects an object
// we don't need the dragging.
var selecting;

var client_onserverupdate_received = function(data){
  globalGame.my_role = data.trialInfo.roles[globalGame.my_id];

  // Update client versions of variables with data received from
  // server_send_update function in game.core.js
  //data refers to server information
  if(data.players) {
    _.map(_.zip(data.players, globalGame.players),function(z){
      z[1].id = z[0].id;
    });
  }

  if (globalGame.roundNum != data.roundNum) {
    globalGame.goalSets = data.trialInfo.currStim.goalSets;
    globalGame.targetGoal = data.trialInfo.currStim.target;
    globalGame.objects = _.map(data.trialInfo.currStim.hiddenCards, function(obj) {
      var imgObj = new Image(); //initialize object as an image (from HTML5)
      imgObj.src = obj.url; // tell client where to find it
      return _.extend(obj, {img: imgObj});
    });
  };
  
  globalGame.game_started = data.gs;
  globalGame.players_threshold = data.pt;
  globalGame.player_count = data.pc;
  globalGame.roundNum = data.roundNum;
  globalGame.roundStartTime = new Date();
  globalGame.allObjects = data.allObjects;

  if(!_.has(globalGame, 'data')) {
    globalGame.data = data.dataObj;
  }

  // Get rid of "waiting" screen if there are multiple players
  if(data.players.length > 1) {
    $('#main').show();

    globalGame.get_player(globalGame.my_id).message = "";

    // reset labels
    // Update w/ role (can only move stuff if agent)
    $('#roleLabel').empty().append("You are the " + globalGame.my_role + '.');

    if(globalGame.my_role === globalGame.playerRoleNames.role1) {
      $('#chatarea').show();      
      $('#instructs')
	.empty()
	.append("<p>Fill in the question so your partner</p>" +
		"<p>can help you find the cards in your goal!</p>");
    } else if(globalGame.my_role === globalGame.playerRoleNames.role2) {
      $('#chatarea').hide();
      $('#advance_button').show().attr('disabled', 'disabled');
      $('#instructs').empty().append(
	"<p>After your partner types their question,</p>" 
	  + "<p>select <b>one</b> or <b>two</b> cards to reveal!</p>");
    }
  }
    
  // Draw all this new stuff
  drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
};

var advanceRound = function() {
  // Stop letting people click stuff
  $('#advance_button').show().attr('disabled', 'disabled');
  disableCards(globalGame.selections);
  globalGame.revealedCards = globalGame.revealedCards.concat(globalGame.selections);
  globalGame.socket.send("reveal." + globalGame.selections.join('.'));
  globalGame.numQuestionsAsked += 1;
  globalGame.messageSent = false;
  globalGame.selections = [];
};

var client_onMessage = function(data) {

  var commands = data.split('.');
  var command = commands[0];
  var subcommand = commands[1] || null;
  var commanddata = commands[2] || null;

  switch(command) {
  case 's': //server message
    switch(subcommand) {

    case 'end' :
      // Redirect to exit survey
      console.log("received end message...");
      ondisconnect();
      $('#context').hide();
      break;

      
    case 'alert' : // Not in database, so you can't play...
      alert('You did not enter an ID');
      window.location.replace('http://nodejs.org'); break;

    case 'join' : //join a game requested
      var num_players = commanddata;
      client_onjoingame(num_players, commands[3]); break;

    case 'add_player' : // New player joined... Need to add them to our list.
      console.log("adding player" + commanddata);
      if(hidden === 'hidden') {
        flashTitle("GO!");
      }
      globalGame.players.push({id: commanddata,
             player: new game_player(globalGame)}); break;
    }
  }
};

var setupOverlay = function() {
  var closeButton = document.getElementById('transition_button');
  closeButton.onclick = () => {
    $('#transition_text').hide();
    $('#dimScreen').hide();    
  };
};

var client_addnewround = function(game) {
  $('#roundnumber').append(game.roundNum);
};

var checkCards = function() {
  var targetCards = globalGame.goalSets[globalGame.targetGoal];
  return _.isEqual(_.intersection(targetCards, globalGame.revealedCards),
		   targetCards);
}

var customSetup = function(game) {
  game.socket.on('updateScore', function(data) {
    var numGoals = globalGame.goalSets[globalGame.targetGoal].length;
    var numRevealed = globalGame.revealedCards.length;
    var numQuestionsAsked = globalGame.numQuestionsAsked;
    var revealPenalty = (numRevealed - numGoals);
    var questionPenalty = (numQuestionsAsked - 1);
    var score = (revealPenalty + questionPenalty) > 0 ? 0 : globalGame.bonusAmt;
    globalGame.data.subject_information.score += score;
    var bonus_score = (parseFloat(globalGame.data.subject_information.score) / 100
		       .toFixed(2));
    $('#feedback').html('you revealed ' + revealPenalty + ' more cards than required\n \
                 and asked ' + questionPenalty + ' more questions than required\n \
                 so you received ' + score + '/5 possible cents');
    $('#score').empty().append('total bonus: $' + bonus_score);
    $('#messages').empty();
    $("#context").fadeOut(1000, function() {$(this).empty();});
    $("#goals").fadeOut(1000, function() {$(this).empty();});
    $('#advance_button').hide();
    globalGame.confetti.drop();
  });
  
  game.socket.on('reveal', function(data) {
    globalGame.revealedCards = globalGame.revealedCards.concat(data.selections);
    globalGame.numQuestionsAsked += 1;
    // Fade in revealed cards
    _.forEach(data.selections, name => {
      var col = $(`img[data-name="${name}"]`).parent().css('grid-column')[0];
      var row = $(`img[data-name="${name}"]`).parent().css('grid-row')[0];
      $('#haze-' + col + row).hide();
      $(`img[data-name="${name}"]`)
	.css({opacity: 0.0})
	.show()
	.css({opacity: 1, 'transition': 'opacity 2s linear'});
    });
    if(checkCards()) {
      game.socket.emit('allCardsFound', data);
    }
  });
  
  game.socket.on('newRoundUpdate', function(data){
    globalGame.messageSent = false;
    globalGame.numQuestionsAsked = 0;
    globalGame.revealedCards = [];
    $('#scoreupdate').html(" ");
    if(game.roundNum + 2 > game.numRounds) {
      $('#roundnumber').empty();
      $('#instructs').empty()
        .append("Round\n" + (game.roundNum + 1) + "/" + game.numRounds);
    } else {
      $('#feedback').empty();
      $('#roundnumber').empty()
        .append("Round\n" + (game.roundNum + 2) + "/" + game.numRounds);
    }
  });

  game.socket.on('finishedGame', function(data) {
    $("#main").hide();
    $("#header").hide();
    $("#exit_survey").show();    
  });  
};

var client_onjoingame = function(num_players, role) {
  // set role locally
  globalGame.my_role = role;
  globalGame.get_player(globalGame.my_id).role = globalGame.my_role;
  _.map(_.range(num_players - 1), function(i){
    globalGame.players.unshift({id: null, player: new game_player(globalGame)});
  });

  if(num_players == 1) {
  //   if(_.size(this.urlParams) == 4) {
  //     this.submitted = true;
  //     window.opener.turk.submit(this.data, true);
  //     window.close();
  //   } else {
  //     console.log("would have submitted the following :");
  //     console.log(this.data);
  //   }
    globalGame.get_player(globalGame.my_id).message = ('<p>Waiting for another player...<br /> Please do not refresh the page!<br /> If wait exceeds 5 minutes, we recommend returning the HIT and trying again later.</p>');
  }
};

/*
 MOUSE EVENT LISTENERS
 */

// function dragMoveListener (event) {
//   // Tell the server if this is a real drag event (as opposed to an update from partner)
//   var container = $('#message_panel')[0];
//   var width = parseInt(container.getBoundingClientRect().width);
//   var height = parseInt(container.getBoundingClientRect().height);
//   if(_.has(event, 'name')) {
//     event.target = $(`p:contains("${event.name}")`)[0];
//     event.dx = parseFloat(event.dx) / event.width * width;
//     event.dy = parseFloat(event.dy) / event.height * height;
//   }

//   // keep the dragged position in the data-x/data-y attributes
//   var target = event.target,
//       x = (parseFloat(target.getAttribute('data-x')) || 0) + parseFloat(event.dx),
//       y = (parseFloat(target.getAttribute('data-y')) || 0) + parseFloat(event.dy);
  

//   // translate the element
//   target.style.webkitTransform =
//     target.style.transform =
//     'translate(' + x + 'px, ' + y + 'px)';

//   // update the posiion attributes
//   target.setAttribute('data-x', x);
//   target.setAttribute('data-y', y);
// }
