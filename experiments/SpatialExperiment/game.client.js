var UI = require('./drawing.js');

// Update client versions of variables with data received from
// server_send_update function in game.core.js
// -- data: packet send by server
function updateState (game, data){
  game.my_role = data.currStim.role;
  
  if(data.players) {
    _.map(_.zip(data.players, game.players),function(z){
      z[1].id = z[0].id;
    });
  }

  game.goalSets = data.currStim.goalSets;
  game.targetGoal = data.currStim.target;
  game.objects = _.map(data.currStim.hiddenCards, function(obj) {
    var imgObj = new Image(); //initialize object as an image (from HTML5)
    imgObj.src = obj.url; // tell client where to find it
    return _.extend(obj, {img: imgObj});
  });

  game.active = data.active;
  game.roundNum = data.roundNum;
  game.roundStartTime = Date.now();
};

var client_addnewround = function(game) {
  $('#roundnumber').append(game.roundNum);
};

var checkCards = function(game) {
  var targetCards = game.goalSets[game.targetGoal];
  return _.isEqual(_.intersection(targetCards, game.revealedCards),
		   targetCards);
}

var customEvents = function(game) {
  console.log('launched custom events');
  // Update messages log when other players send chat  
  game.socket.on('chatMessage', function(data){
    game.numQuestionsAsked += 1;
    game.messageReceivedTime = Date.now();
    var source = game.my_role == "seeker" ? 'You' : "Seeker";
    // To bar responses until speaker has uttered at least one message
    if(source !== "You"){
      game.messageSent = true;
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
    if(game.bot.role == 'helper') {
      game.bot.revealAnswer(data.code);
    }
  });

  game.socket.on('updateScore', function(data) {
    var numGoals = game.goalSets[game.targetGoal].length;
    var numRevealed = game.revealedCards.length;
    var numQuestionsAsked = game.numQuestionsAsked;
    var revealPenalty = (numRevealed - numGoals);
    var questionPenalty = (numQuestionsAsked - 1);
    var score = (revealPenalty > 0 || questionPenalty > 0) ? 0 : game.bonusAmt;
    console.log(score);
    console.log(questionPenalty);
    game.data.subject_information.score += score;
    var bonus_score = (parseFloat(game.data.subject_information.score) / 100
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
    game.confetti.drop();
  });
  
  game.socket.on('reveal', function(data) {    
    // Fade in revealed cards
    if(game.my_role == 'seeker') {
      UI.fadeInSelections(data.selections);
    }
    if(checkCards(game)) {
      game.socket.emit('allCardsFound', data);
    } else if (game.bot.role == 'seeker') {
      game.bot.showQuestion();
    } else {
      $('#chatbutton').removeAttr('disabled');
      game.messageSent = false;
    }
  });

  // Tell server when client types something in the chatbox
  $('form').submit(function(){
    var code = $('#chatbox_rank').val() +  $('#chatbox_suit').val();
    var rankText = $('#chatbox_rank').find('option:selected').text();
    var suitText = $('#chatbox_suit').find('option:selected').text();    
    var origMsg = ("Where is the " + rankText + " of " + suitText + "?");
    var timeElapsed = Date.now() - game.roundStartTime;
    var msg = ['chatMessage', code, origMsg.replace(/\./g, '~~~'), timeElapsed, 'human']
	.join('.');
    if(rankText != '' && suitText != '') {
      game.socket.send(msg);
      game.sentTyping = false;
      $("#chatbox_rank").val('');
      $("#chatbox_suit").val('');
      $('#chatbutton').attr('disabled', 'disabled');                  
    }
    return false;   
  });

  game.socket.on('newRoundUpdate', function(data){
    console.log('received update');
    game.bot = new Bot(game, data);
    game.getPlayer(game.my_id).message = "";
    game.messageSent = false;
    game.numQuestionsAsked = 0;
    game.revealedCards = [];

    updateState(game, data);
    if(data.active) {
      UI.reset();
      UI.drawScreen(game.getPlayer(game.my_id));
    }

    // Kick things off by asking a question 
    if(game.bot.role == 'seeker') {
      game.bot.showQuestion();
    }
  });
};

class Bot {
  constructor(game, data) {
    this.game = game;
    this.role = data.currStim.role == 'helper' ? 'seeker' : 'helper';
    this.goalSets = data.currStim.goalSets;
    this.targetSet = data.currStim.target;
  }

  // Always asks about non-overlapping card
  showQuestion() {
    // remove revealed cards from goal set, so it won't keep asking about same card
    var goalSet = _.difference(this.goalSets[this.targetSet], this.game.revealedCards);
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
      this.game.socket.send("chatMessage." + code + '.' + msg + '.5000.bot');
    }, 5000);
  }
  
  revealAnswer(cardAskedAbout) {
    var goalSet = this.goalSets[this.targetSet];
    var overlap = _.intersection(this.goalSets['g0'], this.goalSets['g1']);
    var inGoal = _.includes(goalSet, cardAskedAbout);
    var remainingCards = _.difference(_.map(this.game.objects, 'name'),
			     this.game.revealedCards);
    var cardExists = _.includes(remainingCards, cardAskedAbout);

    // only reveal full set if seeker asks 'pragmatic' question;
    // otherwise respond literally. 
    // if card doesn't exist, pick a random one from goal sets...?
    var selections = (
      cardExists ?
	(cardAskedAbout == overlap || !inGoal ? [cardAskedAbout] : goalSet) :
      [_.sample(_.sample(this.goalSets))]
    );

    this.game.revealedCards = _.concat(this.game.revealedCards, selections);
    setTimeout(function() {
      this.game.socket.send("reveal.bot.2500." + selections.join('.'));      
    }, 2500);
  }
}

module.exports = customEvents;
