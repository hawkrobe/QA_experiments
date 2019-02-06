var Confetti = require('./src/confetti.js');
var confetti = new Confetti(300);

// This gets called when someone selects something in the menu during the 
// exit survey... collects data from drop-down menus and submits using mmturkey
function dropdownTip(data){
  var commands = data.split('::');
  switch(commands[0]) {
  case 'human' :
    $('#humanResult').show();
    globalGame.data = _.extend(globalGame.data, 
			       {'thinksHuman' : commands[1]}); break;
  case 'language' :
    globalGame.data = _.extend(globalGame.data, 
			       {'nativeEnglish' : commands[1]}); break;
  case 'partner' :
    globalGame.data = _.extend(globalGame.data,
			       {'ratePartner' : commands[1]}); break;
  case 'confused' :
    globalGame.data = _.extend(globalGame.data,
			       {'confused' : commands[1]}); break;
  case 'submit' :
    globalGame.data = _.extend(globalGame.data, 
			       {'comments' : $('#comments').val(),
				'strategy' : $('#strategy').val(),
				'role' : globalGame.my_role,
				'totalLength' : Date.now() - globalGame.startTime});
    globalGame.submitted = true;
    console.log("data is...");
    console.log(globalGame.data);
    if(_.size(globalGame.urlParams) >= 4) {
      globalGame.socket.send("exitSurvey." + JSON.stringify(globalGame.data));
      window.opener.turk.submit(globalGame.data, true);
      window.close(); 
    } else {
      console.log("would have submitted the following :")
      console.log(globalGame.data);
    }
    break;
  }
}

function setupLeaderHandlers(game) {
  $('.pressable').click(function(event) {
    // Only let leader click once they've heard answer back
    if(game.answerSent) {
      game.revealCell($(this));
    }
  });
}

function initBombMap(game) {
  // Add objects to grid
  _.forEach(['A','B','C'], (rowName, i) => {
    _.forEach(_.range(1,4), (colName, j) => {
      var underlying = game.fullMap[rowName + colName];
      var div = $('<div/>').css({position: 'relative'});
      if(underlying == 'r') {
	div.append($('<img/>')
		   .addClass('bomb')
		   .css({'grid-row': i, 'grid-column': j,
			 'z-index': 1, position: 'absolute', left:'0px'}));
      } else {
	div.append($('<div/>')
		   .css({'background' : 'url("../../images/checkmark.png") no-repeat',
			 'background-size' : 'cover',
			 'height' : '100%', 'width' : '100%',
			 'grid-row': i, 'grid-column': j,
			 'z-index': 1, position: 'absolute', left:'0px'}));
      }
      $("#bomb-map").append(div);
    });
  });
  $("#map").append(
    $('<span/>')
      .text('Secret bomb map')
      .css({'position' : 'absolute', 'bottom' : '0vh',
	    'margin-left': '-15vh', 'width' : '30vh', 'text-align' : 'center',
	    'font-size' : '150%'})
  );
}

function initGrid(game) {
  // Add objects to grid
  _.forEach(['A','B','C'], (rowName, i) => {
    _.forEach(_.range(1,4), (colName, j) => {
      var underlying = game.fullMap[rowName + colName];
      var initialize = _.includes(game.initRevealed, rowName + colName);
      var div = $('<div/>').css({position: 'relative'});
      var underlyingState = $('<img/>')
	  .addClass('underlying_' + underlying)
	  .attr({'id' : 'underlying-state-' + rowName + colName})
	  .css({'grid-row': i, 'grid-column': j,
		'z-index': 1, position: 'absolute', left:'0px'});
      div.append(underlyingState);
      if(!initialize) {
	div.append($('<div/>')
		   .addClass('pressable')
		   .attr({'id' : 'button-'+rowName+colName,
			  'style' : 'background: url("../../images/unpressedCell-' + rowName + colName + '.png") no-repeat; background-size :cover; z-index: 2; position: absolute'
			 })
		  );
      }
      $("#context").append(div);
    });
  });

  $("#context").fadeIn();
  // Unbind old click listeners if they exist
  $('#context img')
    .off('click');

  // Allow listener to click on things
  game.selections = [];
  if (game.my_role === game.playerRoleNames.role1) {
    setupLeaderHandlers(game);
  }
}

function fadeInSelections(cells){
  _.forEach(cells, loc => {
    // Move state to front
    $('#underlying-state-' + loc)
      .css({'z-index': 3});
    // Fade in
    $('#underlying-state-' + loc)
      .css({opacity: 0, 'pointer-events' : 'none'})
      .show()
      .css({opacity: 0.25, 'transition': 'opacity 1s linear'});
  });
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

function fadeOutSelections(cells) {
  _.forEach(cells, (name) => {
    var cellElement = $('#underlying-state-' + name);
    cellElement.css({'transition' : 'opacity 1s', opacity: 0.2});
  });
}

function drawScreen (game) {
  var player = game.getPlayer(game.my_id);
  if (player.message) {
    $('#waiting').html(this.player.message);
  } else {
    $('#waiting').html('');
    confetti.reset();
    initGrid(game);
    if(game.my_role == game.playerRoleNames.role2) {
      initBombMap(game);
    }    
  }
};

function reset (game, data) {
  $('#question_button').removeAttr('disabled');
  $('#scoreupdate').html(" ");
  if(game.roundNum + 1 > game.numRounds) {
    $('#roundnumber').empty();
    $('#instructs').empty()
      .append("Round\n" + (game.roundNum + 1) + "/" + game.numRounds);
  } else {
    $('#feedback').empty();
    $('#roundnumber').empty()
      .append("Round\n" + (game.roundNum + 1) + "/" + game.numRounds);
  }

  $('#main').show();

  // reset labels
  // Update w/ role (can only move stuff if agent)
  $('#roleLabel').empty().append("You are the " + game.my_role + '.');
  $('#instructs').empty();
  if(game.my_role === game.playerRoleNames.role1) {
    $('#leaderchatarea').show();
    $('#helperchatarea').hide();          
    $('#instructs')
      .append("<p>On this round, your goal is to complete one of the <b>" +
	      game.goal + "</b>.</p>" +
	      "<p> Your partner wants to help you avoid the bombs, so ask them a question!");
  } else if(game.my_role === game.playerRoleNames.role2) {
    $('#leaderchatarea').hide();
    $('#helperchatarea').show();
    $('#instructs')
      .append("<p>After your partner types their question, check your bomb map and help them!</p>" 
	      + "<p>Remember they are either trying to complete a row or a column.</p>");
    $('#yes_button').click({game: game, response: 'yes'}, giveAdditionalInfo);
    $('#no_button').click({game: game, response: 'no'}, giveAdditionalInfo);
  }
  drawScreen(game);
}

module.exports = {
  confetti,
  drawScreen,
  fadeOutSelections,
  fadeInSelections,
  reset
};
