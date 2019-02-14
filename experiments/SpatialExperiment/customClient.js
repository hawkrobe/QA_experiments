var UI = require('./drawing.js');
var Bot = require('./bots.js');

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

  console.log(data.currStim);
  game.fullMap = _.clone(data.currStim.underlying);
  game.gridState = _.clone(data.currStim.initRevealed);
  game.goal = data.currStim.goal;  
  game.revealedCells = _.clone(game.gridState['safe']);
  game.active = data.active;
  game.roundNum = data.roundNum;
  game.roundStartTime = Date.now();
};

var client_addnewround = function(game) {
  $('#roundnumber').append(game.roundNum);
};

function initialResponse(event) {
  var game = event.data.game;
  var response = event.data.response;
  game.optionSelected = response;
  $('#additional_info').show();
  if(response == 'yes, it is safe') {
    $('#unsafe_button').css({opacity: 0.25, 'transition': 'opacity 0.5s linear'});
  } else {
    $('#safe_button').css({opacity: 0.25, 'transition': 'opacity 0.5s linear'});
  }
  $('#unsafe_button').attr('disabled', 'disabled');
  $('#safe_button').attr('disabled', 'disabled');
}

// If they don't want to give more info, go ahead and sent the message
// Otherwise replace this choice w/ menu for pragmatic answer...
function giveAdditionalInfo(event) {
  var game = event.data.game;
  var response = event.data.response;
  if(response == 'no') {
    game.sendAnswer();
  } else {
    $('#additional_info_init').show();
  }
  $('#additional_info').hide();
}

function goalQueryResponse(event) {
  event.data.game.socket.send(['goalInference', event.data.response].join(','));
  $('#goal_query').hide();
  $('#safeness_choice').show().css({display: 'inline-block'});
  $('#safe_button').css({opacity : 1}).removeAttr('disabled');
  $('#unsafe_button').css({opacity : 1}).removeAttr('disabled');      

}

var customEvents = function(game) {
  // Process responses to 'give additional info?' question
  $('#rows_button').click({game: game, response: 'rows'}, goalQueryResponse);
  $('#columns_button').click({game: game, response: 'columns'}, goalQueryResponse);
  $('#yes_button').click({game: game, response: 'yes'}, giveAdditionalInfo);
  $('#no_button').click({game: game, response: 'no'}, giveAdditionalInfo);
  $('#safe_button').click({game: game, response: 'yes, it is safe'}, initialResponse);
  $('#unsafe_button').click({game: game, response: 'no, it is NOT safe'},
			    initialResponse);


  // Tell server when answerer sends
  $('#answer_button').click(function() {
    $('#additional_info_init').hide();
    $('#answer_button').attr('disabled', 'disabled');
    game.sendAnswer();
  });        

  // Tell server when questioner types something in the chatbox
  $('#question_button').click(function(){
    var row = $('#chatbox_row').val();
    var col = $('#chatbox_col').val();
    var code =  row + col;
    var timeElapsed = Date.now() - game.roundStartTime;
    var msg = ['question', code, timeElapsed, 'human', game.my_role]
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

  // Log as revealed
  game.revealCell= function(cell) {
    if(cell.length > 0) {
      var buttonName = cell.attr('id').split('-')[1];
      game.revealedCells.push(buttonName);
	
      // replace button with underlying state
      cell.siblings().show().css({'opacity' : 1});
      cell.remove();
      return game.checkGrid();
    } else {
      console.log('tried to reveal non-existant cell...');
    }
  };
  
  game.sendAnswer = function() {
    var msg = game.optionSelected;
    var askedAboutCell = game.askedAboutCell; 
    var additionalCell = ($('#helper_row option:selected').text() +
			  $('#helper_col option:selected').text());
    var cells = (additionalCell == '' ? [askedAboutCell] :
		 [askedAboutCell, additionalCell]);
    var timeElapsed = Date.now() - game.roundStartTime;
    
    if(additionalCell != '') {
      msg += " and " + additionalCell + ' is ';
      msg += $('#helper_safe option:selected').text();
    }
    $('#helper_row').val('');
    $('#helper_col').val('');
    $('#helper_safe').val('');

    game.socket.send(['answer', msg, timeElapsed, 'human', game.my_role]
		     .concat(cells).join('.'));
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
    
    if(_.includes(goodness, 'x')) {
      console.log('fail');
      game.socket.emit('endRound', {outcome: 'fail'});
      $('.pressable').off('click');
      return true;
    } else if (goal == 'rows' && _.some(completeRow, row => row.length == 3) ||
	       goal == 'columns' && _.some(completeCol, col => col.length == 3)) {
      console.log('success');
      game.socket.emit('endRound', {outcome: 'success'});
      $('.pressable').off('click');
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

    // get rid of 'partner is typing...' message
    $('.typing-msg').remove();

    // append message to pane
    $('#messages')
      .append($('<li style="padding: 5px 10px; background: ' + color + '">')
    	      .text(source + ": " + data.msg))
      .stop(true,true)
      .animate({
	scrollTop: $("#messages").prop("scrollHeight")
      }, 800);
    
    // bar responses until speaker has uttered at least one message (and vice versa)
    if(data.source_role == "helper"){
      $('#question_button').removeAttr('disabled');
      $('#safeness_choice').hide();
      game.answerSent = true;
      game.questionSent = false;
      game.selections = data.code;
      game.numCellsClicked = 0;

      // Update state & tell bot about it
      _.forEach(game.selections, function(cell) {
	var c = game.fullMap[cell] == 'x' ? 'unsafe' : 'safe';
	game.gridState[c].push(cell);
      });
      game.bot.update(game.gridState);

      // Show players the updated common ground
      UI.fadeInSelections(game.selections);
      if(data.sender == 'human') {
	game.bot.reveal(data.code);
      }
    } else {
      $('#answer_button').removeAttr('disabled');
      $('#goal_query').show();
      game.answerSent = false;
      game.questionSent = true;
      game.askedAboutCell = data.code;
      if(data.sender == 'human') {
	game.bot.answer(data.code);
      }
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
    $("#bomb-map").fadeOut(1000, function() {$(this).empty();});    
    if(data.outcome == 'success') {
      UI.confetti.drop();
    }
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
      game.bot.ask();
    }
  });
};

module.exports = customEvents;
