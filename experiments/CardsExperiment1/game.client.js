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

var incorrect;
var waiting;

// test: let's try a variable selecting, for when the listener selects an object
// we don't need the dragging.
var selecting;

// Update client versions of variables with data received from
// server_send_update function in game.core.js
// -- data: packet send by server
function updateState (data){
  globalGame.my_role = data.trialInfo.currStim.role;
  
  if(data.players) {
    _.map(_.zip(data.players, globalGame.players),function(z){
      z[1].id = z[0].id;
    });
  }

  globalGame.goalSets = data.trialInfo.currStim.goalSets;
  globalGame.targetGoal = data.trialInfo.currStim.target;
  globalGame.objects = _.map(data.trialInfo.currStim.hiddenCards, function(obj) {
    var imgObj = new Image(); //initialize object as an image (from HTML5)
    imgObj.src = obj.url; // tell client where to find it
    return _.extend(obj, {img: imgObj});
  });

  globalGame.active = data.active;
  globalGame.roundNum = data.roundNum;
  globalGame.roundStartTime = Date.now();
  globalGame.allObjects = data.allObjects;
  if(!_.has(globalGame, 'data')) {
    globalGame.data = data.dataObj;
    globalGame.data.subject_information.quizFailCounter = globalGame.counter;    
  }
};

function resetUI(data) {
  globalGame.messageSent = false;
  globalGame.numQuestionsAsked = 0;
  globalGame.revealedCards = [];
  $('#chatbutton').removeAttr('disabled');
  globalGame.messageSent = false;
  
  $('#scoreupdate').html(" ");
  if(globalGame.roundNum + 1 > globalGame.numRounds) {
    $('#roundnumber').empty();
    $('#instructs').empty()
      .append("Round\n" + (globalGame.roundNum + 1) + "/" + globalGame.numRounds);
  } else {
    $('#feedback').empty();
    $('#roundnumber').empty()
      .append("Round\n" + (globalGame.roundNum + 1) + "/" + globalGame.numRounds);
  }

  $('#main').show();
  globalGame.get_player(globalGame.my_id).message = "";

  // reset labels
  // Update w/ role (can only move stuff if agent)
  $('#roleLabel').empty().append("You are the " + globalGame.my_role + '.');
  $('#instructs').empty();
  if(globalGame.my_role === globalGame.playerRoleNames.role1) {
    $('#chatarea').show();      
    $('#instructs')
      .append("<p>Fill in the question so your partner</p> " +
	      "<p>can help you complete the highlighted combo!</p>");
  } else if(globalGame.my_role === globalGame.playerRoleNames.role2) {
    $('#chatarea').hide();
    $('#feedback').append('0/2 possible cards selected');
    $('#advance_button').show().attr('disabled', 'disabled');
    $('#instructs')
      .append("<p>After your partner types their question, </p>" 
	      + "<p>select up to <b>two</b> cards to complete their combo!</p>");
  }
}

var advanceRound = function() {
  // Stop letting people click stuff
  $('#advance_button').show().attr('disabled', 'disabled');
  disableCards(globalGame.selections);
  globalGame.revealedCards = globalGame.revealedCards.concat(globalGame.selections);
  globalGame.socket.send("reveal.human." + globalGame.selections.join('.'));
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
  // Update messages log when other players send chat
  game.socket.on('chatMessage', function(data){
    var source = globalGame.my_role == "seeker" ? 'You' : "Seeker";
    // To bar responses until speaker has uttered at least one message
    if(source !== "You"){
      globalGame.messageSent = true;
    }
    var col = source === "You" ? "#363636" : "#707070";
    $('.typing-msg').remove();
    $('#messages')
      .append($('<li style="padding: 5px 10px; background: ' + col + '">')
    	      .text(source + ": " + data.msg))
      .stop(true,true)
      .animate({
	scrollTop: $("#messages").prop("scrollHeight")
      }, 800);
    if(globalGame.bot.role == 'helper') {
      globalGame.bot.revealAnswer(data.code);
    }
  });

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
    var feedbackMessage = (questionPenalty > 0 ? "Sorry, you did not complete the combo in one exchange." :
			   revealPenalty > 0 ? "Sorry, you revealed cards that weren't in the combo." :
			   "Great job! You completed the combo in one exchange!");
    $('#feedback').html(feedbackMessage + ' You earned $0.0' + score);
    $('#score').empty().append('total bonus: $' + bonus_score);
    $('#messages').empty();
    $("#context").fadeOut(1000, function() {$(this).empty();});
    $("#goals").fadeOut(1000, function() {$(this).empty();});
    $('#advance_button').hide();
    globalGame.confetti.drop();
  });
  
  game.socket.on('reveal', function(data) {    
    // Fade in revealed cards
    if(globalGame.my_role == 'seeker') {
      fadeInSelections(data.selections);
    }
    if(checkCards()) {
      game.socket.emit('allCardsFound', data);
    } else if (globalGame.bot.role == 'seeker') {
      globalGame.bot.showQuestion();
    } else {
      $('#chatbutton').removeAttr('disabled');
      globalGame.messageSent = false;
    }
  });
  
  game.socket.on('newRoundUpdate', function(data){
    globalGame.bot = new Bot(data);
    updateState(data);
    if(data.active) {
      resetUI(data);
      drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
    }

    // Kick things off by asking a question 
    if(globalGame.bot.role == 'seeker') {
      globalGame.bot.showQuestion();
    }
  });
};

class Bot {
  constructor(data) {
    this.role = data.trialInfo.currStim.role == 'helper' ? 'seeker' : 'helper';
    this.goalSets = data.trialInfo.currStim.goalSets;
    this.targetSet = data.trialInfo.currStim.target;
  }

  // Always asks about non-overlapping card
  showQuestion() {
    // remove revealed cards from goal set, so it won't keep asking about same card
    var goalSet = _.difference(this.goalSets[this.targetSet], globalGame.revealedCards);
    var code = goalSet[0];
    var rank = code.slice(0,-1);
    var suit = code.slice(-1);    
    var rankText = $(`#chatbox_rank option[value='${rank}']`).text();
    var suitText = $(`#chatbox_suit option[value='${suit}']`).text();    
    var msg = "Where is the " + rankText + ' of ' + suitText + '?';
    $('#messages')
      .append('<span class="typing-msg">Other player is typing... Study the possible combos!</span>')
      .stop(true,true)
      .animate({
	scrollTop: $("#messages").prop("scrollHeight")
      }, 800);

    setTimeout(function() {
      globalGame.socket.send("chatMessage." + code + '.' + msg + '.5000.bot');
    }, 5000);
  }
  
  revealAnswer(cardAskedAbout) {
    var goalSet = this.goalSets[this.targetSet];
    var overlap = _.intersection(this.goalSets['g0'], this.goalSets['g1']);
    var inGoal = _.includes(goalSet, cardAskedAbout);
    var remainingCards = _.difference(_.map(globalGame.objects, 'name'),
			     globalGame.revealedCards);
    var cardExists = _.includes(remainingCards, cardAskedAbout);

    // only reveal full set if seeker asks 'pragmatic' question;
    // otherwise respond literally. 
    // if card doesn't exist, pick a random one from goal sets...?
    var selections = (
      cardExists ?
	(cardAskedAbout == overlap || !inGoal ? [cardAskedAbout] : goalSet) :
      [_.sample(_.sample(this.goalSets))]
    );

    globalGame.revealedCards = _.concat(globalGame.revealedCards, selections);
    setTimeout(function() {
      globalGame.socket.send("reveal.bot." + selections.join('.'));      
    }, 2500);
  }
}

var client_onjoingame = function(num_players, role) {
  // set role locally
  globalGame.my_role = role;
  globalGame.get_player(globalGame.my_id).role = globalGame.my_role;
  _.map(_.range(num_players - 1), function(i){
    globalGame.players.unshift({id: null, player: new game_player(globalGame)});
  });

  if(num_players == 1) {
    globalGame.get_player(globalGame.my_id).message = ('<p>Waiting for another player...<br /> Please do not refresh the page!<br /> If wait exceeds 5 minutes, we recommend returning the HIT and trying again later.</p>');
  }
};

