var generalizations = {
  'square' : [{
    "name" : "blueSquare3", "url" : "images/blueSquare3.jpg"
  }, {
    "name" : "blueSquare4", "url" : "images/blueSquare4.jpg"
  }, {
    "name" : "redSquare3", "url" : "images/redSquare3.jpg"
  }, {
    "name" : "redSquare4", "url" : "images/redSquare4.jpg"
  }],
  'circle' : [{
    "name" : "stripedCircle3", "url" : "images/stripedCircle3.png"
  }, {
    "name" : "stripedCircle4", "url" : "images/stripedCircle4.png"
  }, {
    "name" : "spottedCircle3", "url" : "images/spottedCircle3.png"
  }, {
    "name" : "spottedCircle4", "url" : "images/spottedCircle4.png"
  }]
};

// We want to test both directions of the lexicon.
// Given a word, what objects does it apply to; given an object, what words apply to it?
function setupPostTest () {
  setupOverlay();
  globalGame.testTargets = _.shuffle(['word', 'object']);
  globalGame.currTargetType = globalGame.testTargets.shift();
  globalGame.testObjects = globalGame.allObjects; //.concat(generalizations[globalGame.stimulusHalf]);
  console.log(globalGame.testObjects);
  globalGame.selections = [];
  
  var button = document.getElementById('post_test_button');
  var objectNames = _.map(globalGame.testObjects, 'name');

  var showNextTarget = () => {
    var targets = globalGame.currTargetType == 'word' ? globalGame.labels : objectNames;
    var targetTag = globalGame.currTargetType == 'word' ? '#word_grid p' : '#object_grid img';
    var targetProperty = globalGame.currTargetType == 'word' ?  'color' : 'border-color';
    var targetSelectedColor = globalGame.currTargetType == 'word' ? 'white' : 'grey';
    var targetUnselectedColor = globalGame.currTargetType == 'word' ? 'grey' : 'white';
    
    // Highlight new target
    globalGame.targetNum += 1;
    globalGame.currTarget = targets[globalGame.targetNum];

    // If targets are words, we show them in context by highlighting them (memory cue)
    // If targets are objects, we show them in isolation (to prevent contrast effects)
    if(globalGame.currTargetType == 'word') {
      $(`${targetTag}[data-name~="${globalGame.currTarget}"`)
	.css(_.zipObject([targetProperty], [targetSelectedColor]));
    } else {
      $(`${targetTag}[data-name~="${globalGame.currTarget}"`)
	.show();
    }
  };

  button.onclick = () => {
    var optionTag = globalGame.currTargetType == 'word' ? '#object_grid img' : '#word_grid p';
    var optionProperty = globalGame.currTargetType == 'word' ? 'border-color' : 'color';
    var optionSelectedColor = globalGame.currTargetType == 'word' ? 'grey' : 'white';
    var optionUnselectedColor = globalGame.currTargetType == 'word' ? 'white' :  'grey';
    var targetTag = globalGame.currTargetType == 'word' ? '#word_grid p' : '#object_grid img';
    var targetProperty = globalGame.currTargetType == 'word' ?  'color' : 'border-color';
    var targetUnselectedColor = globalGame.currTargetType == 'word' ? 'grey' : 'white';
    
    var limit = (globalGame.currTargetType == 'word' ? globalGame.labels.length - 1 :
		 globalGame.testObjects.length - 1);

    // Temporarily disable button to prevent trigger happy people
    var oldValue = button.value;

    button.setAttribute('disabled', true);
    button.value = '...';

    setTimeout(function(){
      button.value = oldValue;
      button.removeAttribute('disabled');
    }, 2000);

    // Send data from current response
    globalGame.socket.send('postTest_' + globalGame.currTargetType + '.'
			   + globalGame.currTarget + '.'
			   + globalGame.selections.join('.'));

    // Unselect old target
    if(globalGame.currTarget) {
      if(globalGame.currTargetType == 'word') {
	$(`${targetTag}[data-name~="${globalGame.currTarget}"`)
	  .css(_.zipObject([targetProperty], [targetUnselectedColor]));
      } else {
	$(`${targetTag}[data-name~="${globalGame.currTarget}"`)
	  .hide();
      } 
    }

    // Clear previous selections
    $(optionTag).css(_.zipObject([optionProperty], [optionUnselectedColor]));
    globalGame.selections = [];

    // If you've advanced through both objs and words, move on to exit survey
    if(globalGame.targetNum >= limit && globalGame.testTargets.length == 0){
      $('#post_test').hide();
      $('#exit_survey').show();
    // If you're done with first batch, move to second
    } else if(globalGame.targetNum >= limit) {
      globalGame.currTargetType = globalGame.testTargets.shift();
      // Make sure all borders are gone
      setupPostTestHTML();
      showNextTarget();      
    } else {
      showNextTarget();
    }
  };  

  // Populate display fields
  _.forEach(globalGame.labels, (word) =>{
    $('#word_grid').append(
      $('<p/>')
	.css({color: 'grey'})
	.addClass('cell')
	.addClass('noselect')
	.text(word)
	.attr({'data-name' : word})      
    );
  });
  
  _.forEach(_.shuffle(globalGame.testObjects), (obj) => {
    $("#object_grid").append(
      $('<img/>')
      	.attr({height: "100%", width: "25%", src: obj.url,
	       'data-name' : obj.name})
	.css({border: '10px solid', 'border-color' : 'white'})
  	.addClass("imgcell")
    );
  });

  setupPostTestHTML();
  showNextTarget();
};

var setupPostTestHTML = function() {
  // Set up instructions and grid locations
  globalGame.targetNum = -1;

  // Set target array at top
  var intendedTop = `#${globalGame.currTargetType}_grid`;
  $(intendedTop).insertAfter( $('#post_test_instruction') );

  // Hide & resize targets if objects (for presentation in isolation)
  _.forEach(globalGame.testObjects, (obj) => {
    if(globalGame.currTargetType == 'object') {
      $(`#object_grid img[data-name~="${obj.name}"`).hide();
      $(`#object_grid img[data-name~="${obj.name}"`).attr({height: '100%', width: '25%'});
    } else {
      $(`#object_grid img[data-name~="${obj.name}"`).show();
      $(`#object_grid img[data-name~="${obj.name}"`).attr({height: '100%', width: '25%'});      
    }
  });
  // Unbind old click listeners if they exist 
  $(globalGame.currTargetType == 'word' ? '#word_grid p' : '#object_grid img')
    .off('click');

  // Set new listeners
  $(globalGame.currTargetType == 'word' ? '#object_grid img' : '#word_grid p')
    .click(function(event) {
      var optionProperty = globalGame.currTargetType == 'word' ? 'border-color' : 'color';
      var selectedColor = globalGame.currTargetType == 'word' ? 'grey' : 'white';
      var unselectedColor = globalGame.currTargetType == 'word' ? 'white' : 'grey';
      if(_.includes(globalGame.selections, $(this).attr('data-name'))) {
	_.remove(globalGame.selections, obj => obj == $(this).attr('data-name'));
	$(this).css(_.zipObject([optionProperty], [unselectedColor]));
      } else {
	globalGame.selections.push($(this).attr('data-name'));
	$(this).css(_.zipObject([optionProperty], [selectedColor]));
      }
    });

  // Update instructions
  var wordTaskInstruction = "<p style='font-size:150%'>If you received this word in a future order, which object(s) would you pack? </p> <p>Please click <b>all</b> that apply, then click 'next'. If you're not sure if it applies to any objects, click 'next' without making a selection.</p>";
  
  var objTaskInstruction = "<p style='font-size:150%'>If this object appeared by itself or with another object in a future order, which word(s) would you use? </p><p> Please click <b>all</b> that apply, then click 'next'. If you're not sure if any words apply, click 'next' without making a selection.</p>";
  
  $('#post_test_instruction').html(globalGame.currTargetType == 'word' ?
  				   wordTaskInstruction : objTaskInstruction);
};
