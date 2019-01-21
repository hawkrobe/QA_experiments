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

  game.fullMap = data.currStim.full;
  game.initRevealed = data.currStim.initRevealed;
  game.revealedCells = game.initRevealed;
  // game.objects = _.map(data.currStim.hiddenCards, function(obj) {
  //   var imgObj = new Image(); //initialize object as an image (from HTML5)
  //   imgObj.src = obj.url; // tell client where to find it
  //   return _.extend(obj, {img: imgObj});
  // });

  game.active = data.active;
  game.roundNum = data.roundNum;
  game.roundStartTime = Date.now();
};

var client_addnewround = function(game) {
  $('#roundnumber').append(game.roundNum);
};

var customEvents = function(game) {
  console.log('launched custom events');
  // Update messages log when other players send chat

  // Win condition is to safely complete row/col
  game.checkGrid = function() {
    var revealedCells = this.revealedCells;
    var goodness = _.map(revealedCells, cell => this.fullMap[cell]);
    var completeCol = _.map(_.range(1,5), colName => {
      return _.filter(revealedCells, cellName => cellName[1] == colName);
    });
    var completeRow = _.map(['A','B','C','D'], rowName => {
      return _.filter(revealedCells, cellName => cellName[0] == rowName);
    });
    if(_.includes(goodness, 'r')) {
      game.socket.emit('fail', {});
      return true;
    } else if (_.some(completeRow, row => row.length == 4) ||
	       _.some(completeCol, col => col.length == 4)) {
      game.socket.emit('allCardsFound', {});
      return true;
    } else {
      return false;
    }
  }
  
  game.socket.on('chatMessage', function(data){
    game.numQuestionsAsked += 1;
    game.messageReceivedTime = Date.now();
    console.log(data);
    var source = game.my_role == "leader" ? 'You' : "leader";
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
    if(game.bot.role == 'helper' && data.sender == 'human') {
      game.bot.revealAnswer(data.code);
    }
  });

  game.socket.on('updateScore', function(data) {
    var numGoals = game.goalSets[game.targetGoal].length;
    var numRevealed = game.revealedCells.length;
    var numQuestionsAsked = game.numQuestionsAsked;
    var revealPenalty = (numRevealed - numGoals);
    var questionPenalty = (numQuestionsAsked - 1);
    var score = (revealPenalty > 0 || questionPenalty > 0) ? 0 : game.bonusAmt;
    game.data.score += score;
    var bonus_score = (parseFloat(game.data.score) / 100
		       .toFixed(2));
    var feedbackMessage = (questionPenalty > 0 ? "Sorry, you did not complete the combo in one exchange." :
			   revealPenalty > 0 ? "Sorry, you revealed cards that weren't in the combo." :
			   "Great job! You completed the combo in one exchange!");
    $('#feedback').html(feedbackMessage + ' You earned $0.0' + score);
    $('#score').empty().append('total bonus: $' + bonus_score);
    $('#messages').empty();
    $("#context").fadeOut(1000, function() {$(this).empty();});
    UI.confetti.drop();
  });
  
  game.socket.on('reveal', function(data) {    
    // Fade in revealed cards
    if(game.my_role == game.playerRoleNames.role1) {
      UI.fadeInSelections(data.selections);
    } else {
      UI.fadeOutSelections(data.selections);
    }

    // See if game is over...
    if(!game.checkGrid()) {
      if (game.bot.role == game.playerRoleNames.role1) {
	game.bot.showQuestion();
      } else {
	$('#chatbutton').removeAttr('disabled');
	game.messageSent = false;
      }    
    } 
  });

  // Tell server when client types something in the chatbox
  $('form').submit(function(){
    var row = $('#chatbox_row').val()
    var col = $('#chatbox_col').val()
    var code =  row + col;
    var origMsg = ("Is " + code + " safe?");
    var timeElapsed = Date.now() - game.roundStartTime;
    var msg = ['chatMessage', code,
	       origMsg.replace(/\./g, '~~~'), timeElapsed, 'human']
	.join('.');
    if(row != '' && col != '') {
      game.socket.send(msg);
      game.sentTyping = false;
      $("#chatbox_row").val('');
      $("#chatbox_col").val('');
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
    game.revealedCells = [];

    if(data.active) {
      updateState(game, data);
      console.log('state is')
      console.log(game);
      UI.reset(game, data);
    }

    // Kick things off by asking a question 
    if(game.bot.role == 'leader') {
      game.bot.showQuestion();
    }
  });
};

class Bot {
  constructor(game, data) {
    this.game = game;
    this.role = data.currStim.role == 'helper' ? 'leader' : 'helper';
    this.fullMap = data.currStim.full;
  }

  // Always asks about non-overlapping card
  showQuestion() {
    // remove revealed cards from goal set, so it won't keep asking about same card
    $('#messages')
      .append('<span class="typing-msg">Other player is selecting question... Study the grid!</span>')
      .stop(true,true)
      .animate({
	scrollTop: $("#messages").prop("scrollHeight")
      }, 800);
    var code = 'A2';
    var msg = 'Is ' + code + ' safe?';
    setTimeout(function() {
      this.game.socket.send("chatMessage." + code + '.' + msg + '.5000.bot');
    }.bind(this), 5000);
  }

  // Currently reveals literal card (will set up pragmatic cases later)
  revealAnswer(cellAskedAbout) {
    var selections = [cellAskedAbout];
    this.game.revealedCells = _.concat(this.game.revealedCells, selections);
    var msg = (this.fullMap[cellAskedAbout] == 'g' ?
	       'Yes, ' + cellAskedAbout + ' is safe' :
	       'No, ' + cellAskedAbout + ' is not safe');
    setTimeout(function() {
      console.log('triggered');
      this.game.socket.send("reveal.bot.2500." + selections.join('.'));
      this.game.socket.send(['chatMessage', cellAskedAbout,
			     msg, 5000, 'bot'].join('.'));
    }.bind(this), 2500);
  }
}

module.exports = customEvents;
