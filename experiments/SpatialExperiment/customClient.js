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

// Update grid state & tell bot about it
function updateGridState (game) {
  _.forEach(game.selections, function(cell) {
    var c = game.fullMap[cell] == 'x' ? 'unsafe' : 'safe';
    game.gridState[c].push(cell);
  });
  game.bot.update(game.gridState);
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
  var game = event.data.game;
  game.socket.send(['goalInference', game.cellAskedAbout, event.data.response,
		    JSON.stringify(game.gridState)].join('.'));
  $('#goal_query').hide();
  $('#safeness_choice').show().css({display: 'inline-block'});
  $('#safe_button').css({opacity : 1}).removeAttr('disabled');
  $('#unsafe_button').css({opacity : 1}).removeAttr('disabled');      
}

var customEvents = function(game) {
  // Process responses to 'give additional info?' question
  $('.exitSurveyDropdown').change({game: game}, UI.dropdownTip);
  $('#surveySubmit').click({game: game}, UI.submit);
  $('#rows_button').click({game: game, response: 'rows'}, goalQueryResponse);
  $('#columns_button').click({game: game, response: 'columns'}, goalQueryResponse);
  $('#not_sure_button').click({game: game, response: 'not sure'}, goalQueryResponse);  
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
    var msg = ['question', code, timeElapsed, 'human',
	       JSON.stringify(game.gridState)].join('.');
    $("#chatbox_row").val('');
    $("#chatbox_col").val('');
    var alreadyRev = _.includes(game.gridState['safe']
				.concat(game.gridState['unsafe']),
				code);
    if(!alreadyRev) {
      if(row != '' && col != '') {
	game.socket.send(msg);
	game.sentTyping = false;
	$('#leaderchatarea').hide();
      }
    } else {
      $('#leaderchatarea').append($('<p/>').text('hmmm, you already know that... Pick another question!').attr('id', 'errormsg'));
      setTimeout(function() {$('#errormsg').remove()}, 1500)
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
      game.checkGrid();
    } else {
      console.log('tried to reveal non-existant cell...');
    }
  };
  
  game.sendAnswer = function() {
    var msg = game.optionSelected;
    var cellAskedAbout = game.cellAskedAbout; 
    var additionalCell = ($('#helper_row option:selected').text() +
			  $('#helper_col option:selected').text());
    var additionalCellStatus = $('#helper_safe option:selected').text();

    var cells = (additionalCell == '' ? [cellAskedAbout] :
		 [cellAskedAbout, additionalCell]);
    var timeElapsed = Date.now() - game.roundStartTime;

    if(additionalCell != '') {
      var cell1Positive = game.optionSelected == 'yes, it is safe';
      var cell2Positive = additionalCellStatus == 'safe';
      var connector = cell1Positive == cell2Positive ? 'and' : 'but';
      msg += [',', connector, additionalCell, 'is', additionalCellStatus].join(' ');
    }
    $('#helper_row').val('');
    $('#helper_col').val('');
    $('#helper_safe').val('');
    var revealed = game.gridState['safe'].concat(game.gridState['unsafe']);
    var alreadyRev = (_.includes(revealed, additionalCell) ||
		      cellAskedAbout == additionalCell);
    var mapAsked = game.fullMap[cellAskedAbout];
    var mapAddl = game.fullMap[additionalCell];    
    var falseAns = (game.optionSelected == 'yes, it is safe' && mapAsked == 'x' ||
		    game.optionSelected == 'no, it is NOT safe' && mapAsked == 'o' ||
		    additionalCellStatus == 'safe' && mapAddl == 'x' ||
		    additionalCellStatus == 'not safe' && mapAddl == 'o');
    if(!alreadyRev && !falseAns) {
      var fullMap = _.mapValues(game.fullMap, v => v == 'o' ? 'safe' : 'unsafe');
      game.socket.send(['answer', msg, timeElapsed, 'human',
			JSON.stringify(game.gridState),
			JSON.stringify(fullMap)].concat(cells).join('.'));
    } else {
      var errorText = (alreadyRev ? 'hmmm, the leader already knows that.' :
		       "hmmm, that's just not true!");
      $('#helperchatarea').append($('<p/>').text(errorText + ' Pick another answer!')
				  .attr('id', 'errormsg'));
      setTimeout(function() {
	$('#errormsg').remove();
	$('#safeness_choice').show().css({display: 'inline-block'});
	$('#safe_button').css({opacity : 1}).removeAttr('disabled');
	$('#unsafe_button').css({opacity : 1}).removeAttr('disabled');
	$('#answer_button').removeAttr('disabled');
      }, 2500);
    }
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

    if(!game.roundOver) {
      if(_.includes(goodness, 'x')) {
	console.log('fail');
	game.socket.emit('endRound', {outcome: 'fail'});
	$('.pressable').off('click');
	game.roundOver = true;
      } else if (goal == 'rows' && _.some(completeRow, row => row.length == 3) ||
		 goal == 'columns' && _.some(completeCol, col => col.length == 3)) {
	console.log('success');
	game.socket.emit('endRound', {outcome: 'success'});
	$('.pressable').off('click');
	game.roundOver = true;
      }
    }
  };
  
  game.socket.on('chatMessage', function(data){
    var partnerRole = _.without(_.values(game.playerRoleNames), game.my_role);
    var source = (data.sender == 'human' ? 'You' :
		  data.sender == "bot" ? partnerRole :
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
    if(data.type == "answer"){
      game.selections = data.code;
      UI.reset(game, 'answerReceived');
      updateGridState(game);
      
      // Show players the updated common ground
      UI.fadeInSelections(game.selections);
      setTimeout(function() {
	var roundOver = [];
	_.forEach(game.selections, id =>  {
	  if(game.fullMap[id] == 'o')
	    game.revealCell($('#button-' + id));
	});
	if(!game.roundOver) {
	  if(data.sender == 'human') {
	    game.bot.ask(data.code);
	  } else {
	    $('#leaderchatarea').show();
	  }
	}
      }, 1000);
    } else if (data.type == 'question') {
      game.cellAskedAbout = data.code;
      game.questionNum += 1;
      UI.fadeInQuestionMark(data.code);
      UI.reset(game, 'questionReceived');
      if(data.sender == 'human') {
	game.bot.answer(data.code);
      }
    } else {
      console.log('unknown chat message type');
    }
  });

  game.socket.on('updateScore', function(data) {
    console.log(game.questionNum);
    var rawScore = data.outcome == 'fail' ? 0 : game.bonusAmt - game.questionNum + 1;
    console.log(rawScore);
    game.data.score += rawScore;    
    var feedbackMessage = (rawScore == 0 ? "You exploded!" :
			   "You safely completed your goal in " +
			   game.questionNum + " questions.");
    var monetaryScore = (parseFloat(game.data.score) / 100).toFixed(2); 
    $('#feedback').html(feedbackMessage + ' You earned $0.0' + rawScore);
    $('#score').empty().append('total bonus: $' + monetaryScore);

    // Some animations to mark end of round
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

    if(data.active) {
      updateState(game, data);
      UI.reset(game, 'newRound');
    }

    // Kick things off by asking a question 
    if(game.bot.role == 'leader') {
      game.bot.ask();
    }
  });
};

module.exports = customEvents;
