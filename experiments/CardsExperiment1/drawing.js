// drawing.js
// This file contains functions to draw on the HTML5 canvas


function handleButton() {
  // Disable or enable button to fit logic
  if(globalGame.selections.length > 0) {
    $('#advance_button').removeAttr('disabled');
  } else {
    $('#advance_button').attr('disabled', 'disabled');
  }
}

function handleHighlighting(imgSelector, name) {
  var alreadyClicked = _.includes(globalGame.selections, name);
  var cellSelector = imgSelector.parent();
  if(alreadyClicked) {
    _.remove(globalGame.selections, obj => obj == name);    
    cellSelector.css({'border-color' : 'white', 'border-width' : '1px'});
  } else if (globalGame.selections.length < 2) {
    globalGame.selections.push(name);
    cellSelector.css({'border-color' : '#32CD32', 'border-width' : '5px'});
  }
  $('#feedback').empty().append(globalGame.selections.length + '/2 possible cards selected');
}

function disableCards(cards) {
  _.forEach(cards, (name) => {
    // Disable card
    var cardElement = $(`img[data-name="${name}"]`);
    cardElement.off('click');
    cardElement.css({'transition': 'opacity 1s',
		     opacity: 0.2});
    cardElement.parent().css({'border-color' : 'white', 'border-width': '1px'});
  });
}

function setupHandlers() {
  $('#context img').click(function(event) {
    var name = $(this).attr('data-name');
    if(globalGame.messageSent) {
      handleHighlighting($( this ), name);
      handleButton();
    }
  });
}

function initGoals(goalSets, targetGoal) {
  _.forEach(_.shuffle(_.values(goalSets)), function(goals, i) {
    var border = (_.isEqual(goals, goalSets[targetGoal]) &&
		  globalGame.my_role == globalGame.playerRoleNames.role1 ?
		  'green' : 'black');
    var cell = $('<div/>').attr({
      height: '10%',
      class : 'grid',
      style: `border-width: thick; border-style: solid; border-color: ${border}`
    });
    cell.append($('<p/>').append(`#${i+1}`))
    _.forEach(_.shuffle(goals), function(goalCard, j) {
      var card = $('<img/>').attr({
	width: '33%',
	outline: '1px solid white',
	src: '/images/thumbnails/' + goalCard + '.svg',
	style : `margin-left: auto; margin-right: auto; vertical-align: middle;`
      });
      cell.append(card);
    });
    $('#goals').append(cell);
    $('#goals').append('<hr>');
  });
  $('#goals').fadeIn();
}

function initGrid(objects) {
  // Add objects to grid
  _.forEach(_.range(1, 5), x => {
    _.forEach(_.range(1, 5), y => {
      var div = $('<div/>')
	  .attr({style: `border: solid 1px #FFFFFF; \
                         background-color: black; grid-column: ${x}; grid-row: ${y}`});
      var obj = _.find(objects, {'gridX' : x, 'gridY' : y});
      // Put image in grid if it exists
      if(!_.isUndefined(obj)){
	var visible = (globalGame.my_role == globalGame.playerRoleNames.role1 ?
		       'display: none' : '');
	div.append($('<img/>').attr({
	  height: '100%', width: '65%', src: obj.url, 'data-name' : obj.name,
	  style : `margin-left: auto; margin-right: auto; \
                   vertical-align: middle; ${visible}`
	}));
      }
      // Put haze in questioner's grid
      if(globalGame.my_role == globalGame.playerRoleNames.role1) {
	div.append($('<img/>').attr({
	  height: '100%', width: '100%', src: 'images/haze.jpg',
	  id: 'haze-' + x + y,
	  style : `margin-left: auto; margin-right: auto; \
                   vertical-align: middle;`
	}));
      } 
      $("#context").append(div);
    });
  });
  $("#context").fadeIn();
  // Unbind old click listeners if they exist
  $('#context img')
    .off('click');

  // Allow listener to click on things
  if (globalGame.my_role === globalGame.playerRoleNames.role2) {
    globalGame.selections = [];
    setupHandlers(); 
  }
}

var drawScreen = function(game, player) {
  // Draw message in center (for countdown, e.g.)
  if (player.message) {
    $('#waiting').html(player.message);
  } else {
    $('#waiting').html('');
    game.confetti.reset();
    initGoals(game.goalSets, game.targetGoal);    
    initGrid(game.objects);
  }
};

// Rain down confetti
class Confetti {
  constructor(count) {
    this.count = count;
  }

  pickColor(index) {
    return (index == 1 ? '#faa040' : // yellow
	    index == 2 ? '#e94a3f' : // blue
	    "#e94a3f");              // red 
  }

  // Initialize confetti particle
  create(i) {
    var width = Math.random() * 8;
    var height = width * 0.4;
    var colourIdx = Math.ceil(Math.random() * 3);
    var colour = this.pickColor(colourIdx);
    $(`<div style="position:fixed" id=confetti-${i} class="confetti"></div>`).css({
      "width" : width+"px",
      "height" : height+"px",
      "top" : -Math.random()*20+"%",
      "left" : Math.random()*100+"%",
      "opacity" : Math.random()+0.5,
      "background-color": colour,
      "transform" : "rotate("+Math.random()*360+"deg)"
    }).appendTo('#header');  
  }

  //Dropp all confetti
  drop() {
    for(var i = 0; i < this.count; i++) {
      this.create(i);
      $('#confetti-' + i).animate({
	top: "100%",
	left: "+="+Math.random()*15+"%"
      }, {
	duration: Math.random()*3000 + 3000
      });
    };
  }

  reset() {
    for(var i = 0; i < this.count; i++) {
      $('#confetti-' + i).remove();
    }
  }
}
