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
    cellSelector.css({'border-color' : 'black'});
  } else if (globalGame.selections.length < 2) {
    globalGame.selections.push(name);
    cellSelector.css({'border-color' : 'green'});
  }
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

// function highlightCell(color, condition) {
//   var targetObjects = _.filter(globalGame.objects, condition);
//   console.log('highlighting in ' + color);
//   console.log(globalGame.objects);
//   console.log(targetObjects);
//   for (var i = 0; i < targetObjects.length; i++){
//     var name = targetObjects[i]['name'];
//     $(`img[data-name="${name}"]`)
//       .css({'border-color' : color});
//   }
// }

function initGoals(goalSets, target) {
  _.forOwn(goalSets, function(value, key) {
    var div = $('<div/>')
	.attr({style: `background-color: #219600; grid-row: ${key[1]}`});
    var card = $('<img/>').attr({
      height: '20%', width: '65%', src: '/images/thumbnails/' + value + '.svg', 'data-name' : value,
      style : `margin-left: auto; margin-right: auto; vertical-align: middle`
    });
    $("#goal_panel").append(card);
  });
}

function initGrid(objects) {
  // Add objects to grid
  var showObjs = 
  _.forEach(_.range(1, 5), x => {
    _.forEach(_.range(1, 5), y => {
      var div = $('<div/>')
	  .attr({style: `border-style: solid; border-color: black; \
                         background-color: black; grid-column: ${x}; grid-row: ${y}`});
      var obj = _.find(objects, {'gridX' : x, 'gridY' : y});
      if(!_.isUndefined(obj)){
	var visible = (globalGame.my_role == globalGame.playerRoleNames.role1 ?
		       'display: none' : '');
	div.append($('<img/>').attr({
	  height: '100%', width: '65%', src: obj.url, 'data-name' : obj.name,
	  style : `margin-left: auto; margin-right: auto; \
                   vertical-align: middle; ${visible}`
	}));
      } 
      $("#context").append(div);
    });
  });

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
    initGoals(game.goalSets, game.target);    
    initGrid(game.objects);
  }
};

// function drawSketcherFeedback(globalGame, scoreDiff, clickedObjNames) {
//   var numTargets = _.filter(globalGame.objects, x => x.targetStatus == 'target').length;
//   var targetWord = numTargets > 1 ? 'targets' : 'target';
//   var clickedWord = clickedObjNames.length > 1 ? 'objects' : 'object';
//   highlightCell('grey', x => x.targetStatus == 'target');
//   if (scoreDiff > 0) {
//     highlightCell('#19A319', x => _.includes(clickedObjNames, x.name));
//     setTimeout(() => {
//       $('#feedback').html('Great job! Your partner correctly identified the ' + targetWord + '.');
//     }, globalGame.feedbackDelay);
//   } else {
//     highlightCell('#FFA500', x => _.includes(clickedObjNames, x.name));
//     setTimeout(() => {
//       $('#feedback').html('Too bad... Your partner clicked the ' + clickedWord + ' outlined in ' +
// 			  'orange'.fontcolor('#FFA500') + '.');
//     }, globalGame.feedbackDelay);
//   }
// };

// function drawViewerFeedback(globalGame, scoreDiff, clickedObjNames) {
//   var numTargets = _.filter(globalGame.objects, x => x.targetStatus == 'target').length;
//   var targetWord = numTargets > 1 ? 'targets' : 'target';
//   var conjugation = numTargets > 1 ? 'are' : 'is';

//   highlightCell('grey', x => _.includes(clickedObjNames, x.name));
//   if (scoreDiff > 0) {
//     highlightCell('#19A319', x => x.targetStatus == 'target');
//     setTimeout(() => {
//       $('#feedback').html('Great job! You correctly identified the ' + targetWord + '!');
//     }, globalGame.feedbackDelay);
//   } else {
//     highlightCell('#FFA500', x => x.targetStatus == 'target');
//     setTimeout(() => {
//       $('#feedback').html('Sorry... The ' + targetWord + ' ' + conjugation + ' outlined in '
// 			  + 'orange'.fontcolor("#FFA500").bold() + '.');
//     }, globalGame.feedbackDelay);
//   }
// };


function disableLabels(game) {
  interact('p').unset();
  interact('#chatarea').unset();
}

function enableLabels(game) {
  var labels = document.querySelector('#message_panel');
  var startPos = null;
  var dropCenter = null;
  interact('p', {context: labels})
    .draggable({
      restrict: {
      	restriction: "parent",
      	endOnly: true,
      	elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
      },
      onstart: function(event) {
      	var rect = interact.getElementRect(event.target);

      	// record center point when starting the very first a drag
      	startPos = {
          x: rect.left + rect.width  / 2,
          y: rect.top  + rect.height / 2
      	}

      	event.interactable.draggable({
          snap: {
            targets: [startPos]
          }
      	});
      },

      snap: {
        targets: [startPos],
        range: Infinity,
        relativePoints: [ { x: 0.5, y: 0.5 } ],
        endOnly: true
      },
      onmove: dragMoveListener
    });
  
  interact('#chatarea')
    .dropzone({
      accept: '.draggable',
      overlap: .5,
      ondragenter: function (event) {
	var draggableElement = event.relatedTarget,
            dropzoneElement  = event.target,
            dropRect         = interact.getElementRect(dropzoneElement);
	
        dropCenter = {
          x: dropRect.left + dropRect.width  / 2,
          y: dropRect.top  + dropRect.height / 2
        };
	
        event.draggable.draggable({
          snap: {
            targets: [dropCenter]
          }
        });
      },
      ondrop: function(event) {
	$('#chatarea').css('background-color', '#32CD32');
	var timeElapsed = new Date() - game.roundStartTime;
	game.socket.send('drop.' + event.relatedTarget.innerHTML + '.' + timeElapsed);
	interact('p', {context: labels}).draggable(false);
      }
    });
};
