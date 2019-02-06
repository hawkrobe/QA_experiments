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
  game.goal = data.currStim.goal;  
  game.revealedCells = game.initRevealed;
  game.active = data.active;
  game.roundNum = data.roundNum;
  game.roundStartTime = Date.now();
};

var client_addnewround = function(game) {
  $('#roundnumber').append(game.roundNum);
};

var customEvents = function(game) {


  // var sendAnswer = function(event) {
  //   var game = event.data.game;
  //   var timeElapsed = Date.now() - game.messageReceivedTime;
  //   game.revealedCells = game.revealedCells.concat(game.selections);  
  //   game.socket.send("answer.human." + timeElapsed + '.' +
  // 		     game.selections.join('.'));
  // };

  game.revealCell= function(cell) {
    if(cell.length > 0) {
      // Log as revealed
      var buttonName = cell.attr('id').split('-')[1];
      game.revealedCells.push(buttonName);

      // replace button with underlying state
      cell.siblings().show().css({'opacity' : 1});
      cell.remove();
      game.checkGrid();
    } else {
      console.log('tried to reveal non-existant cell...');
    }
  };
  
  game.sendAnswer = function() {
    // TODO: this will cause a bug if not the first message
    var msg = $('#yes-no-dropdown option:selected').text();
    var askedAboutCell = $('#messages').text().split(' ')[2];
    var additionalCell = ($('#helper_row option:selected').text() +
			  $('#helper_col option:selected').text());
    var cells = (additionalCell == '' ? [askedAboutCell] :
		 [askedAboutCell, additionalCell]);
    if(additionalCell != '') {
      msg += " and " + additionalCell + ' is ' + $('#helper_safe option:selected').text();
    }
    $('#yes-no-dropdown').val('');
    $('#helper_row').val('');
    $('#helper_col').val('');
    $('#helper_safe').val('');
    var timeElapsed = Date.now() - game.roundStartTime;
    game.socket.send(['answer', 'human', timeElapsed].concat(cells).join('.'));
    game.socket.send(['chatMessage', cells.join('&'),
		      msg, 5000, 'human', game.my_role].join('.'));
  };

  // Win condition is to safely complete row/col
  game.checkGrid = function() {
    var goal = this.goal;
    var revealedCells = this.revealedCells;

    var goodness = _.map(revealedCells, cell => this.fullMap[cell]);
    var completeCol = _.map(_.range(1,4), colName => {
      return _.filter(revealedCells, cellName => cellName[1] == colName);
    });
    var completeRow = _.map(['A','B','C'], rowName => {
      return _.filter(revealedCells, cellName => cellName[0] == rowName);
    });
    if(_.includes(goodness, 'r')) {
      console.log('fail');
      game.socket.emit('endRound', {outcome: 'fail'});
      return true;
    } else if (goal == 'rows' && _.some(completeRow, row => row.length == 3) ||
	       goal == 'columns' && _.some(completeCol, col => col.length == 3)) {
      console.log('success');
      game.socket.emit('endRound', {outcome: 'success'});
      return true;
    } else {
      return false;
    }
  }
  
  game.socket.on('chatMessage', function(data){
    var source = (data.sender == 'human' ? 'You' :
		  data.sender == "bot" ? data.source_role :
		  console.log('unknown source'));
    var color = source === "You" ? "#363636" : "#707070";    
    // To bar responses until speaker has uttered at least one message
    if(data.source_role == "helper"){
      game.answerSent = true;
      game.questionSent = false;
      $('#yes-no-dropdown').attr("disabled","disabled");
    } else {
      game.answerSent = false;
      game.questionSent = true;
      $('#yes-no-dropdown').removeAttr("disabled");
    }
    $('.typing-msg').remove();
    $('#messages')
      .append($('<li style="padding: 5px 10px; background: ' + color + '">')
    	      .text(source + ": " + data.msg))
      .stop(true,true)
      .animate({
	scrollTop: $("#messages").prop("scrollHeight")
      }, 800);
    // If human asks questions, have bot respond with answer
    if(data.sender == 'human' && data.source_role == 'leader') {
      game.bot.answer(data.code);
    }
  });

  game.socket.on('updateScore', function(data) {
    console.log('update score');
    var score = data.outcome == 'fail' ? 0 : game.bonusAmt;
    game.data.score += score;
    var bonus_score = (parseFloat(game.data.score) / 100
		       .toFixed(2));
    // var feedbackMessage = (questionPenalty > 0 ? "Sorry, you did not complete the combo in one exchange." :
    // 			   revealPenalty > 0 ? "Sorry, you revealed cards that weren't in the combo." :
    // 			   "Great job! You completed the combo in one exchange!");
    $('#feedback').html('You earned $0.0' + score);
    $('#score').empty().append('total bonus: $' + bonus_score);
    $('#messages').empty();
    $("#context").fadeOut(1000, function() {$(this).empty();});
    if(data.outcome == 'success') {
      UI.confetti.drop();
    }
  });
  
  game.socket.on('answer', function(data) {    
    // Fade in revealed cards
    //if(game.my_role == game.playerRoleNames.role1) {
      UI.fadeInSelections(data.selections);
    // } else {
    //   UI.fadeOutSelections(data.selections);
    // }

    // See if game is over...
    //
    if (game.my_role == game.playerRoleNames.role2) {
      game.bot.reveal(data.selections);
    } else {
      $('#question_button').removeAttr('disabled');
      game.messageSent = false;
    }    
  });

  // Tell server when answerer types something in the chatbox
  $('#answer_button').click(function() {
    $('#additional_info_init').hide();
    game.sendAnswer();
  });        

  // Tell server when questioner types something in the chatbox
  $('#question_button').click(function(){
    var row = $('#chatbox_row').val();
    var col = $('#chatbox_col').val();
    var code =  row + col;
    var origMsg = ("Is " + code + " safe?");
    var timeElapsed = Date.now() - game.roundStartTime;
    var msg = ['chatMessage', code, origMsg.replace(/\./g, '~~~'),
	       timeElapsed, 'human', game.my_role]
	.join('.');
    if(row != '' && col != '') {
      game.socket.send(msg);
      game.sentTyping = false;
      $("#chatbox_row").val('');
      $("#chatbox_col").val('');
      $('#question_button').attr('disabled', 'disabled');                  
    }
    return false;   
  });
  
  game.socket.on('newRoundUpdate', function(data){
    console.log('received update');
    game.bot = new Bot(game, data);
    game.getPlayer(game.my_id).message = "";
    game.questionSent = false;
    game.answerSent = false;    
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
      this.game.socket.send(["chatMessage", code, msg,
			     5000, 'bot', this.role].join('.'));
    }.bind(this), 5000);
  }

  // Currently reveals literal card (will set up pragmatic cases later)
  answer(cellAskedAbout) {
    var selections = [cellAskedAbout];
    var msg = (this.fullMap[cellAskedAbout] == 'g' ?
	       'Yes, ' + cellAskedAbout + ' is safe' :
	       'No, ' + cellAskedAbout + ' is not safe');
    setTimeout(function() {
      this.game.socket.send("answer.bot.2500." + selections.join('.'));
      this.game.socket.send(['chatMessage', cellAskedAbout,
			     msg, 5000, 'bot', this.role].join('.'));
    }.bind(this), 2500);
  }

  // Clicks on the non-bombs...
  reveal(selections) {
    _.forEach(selections, id =>  {
      if(this.fullMap[id] == 'g')
	this.game.revealCell($('#button-' + id));
    });
    if(!this.game.checkGrid()) {
      this.showQuestion();
    }
  }
}

module.exports = customEvents;
