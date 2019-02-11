const questionerModel = require('./src/spatialQuestionerOutput.json');

class Bot {
  constructor(game, data) {
    this.game = game;
    this.role = data.currStim.role == 'helper' ? 'leader' : 'helper';
    this.fullMap = data.currStim.underlying;
    this.state = data.currStim.initRevealed;
    this.goal = data.currStim.goal;
    this.game.socket.on('receivedQuestion', this.sendQuestion);
  }

  
  // Always asks about non-overlapping card
  ask() {
    console.log('bot asking...');
    $('#messages')
      .append('<span class="typing-msg">Other player is selecting question... \
                Study the grid!</span>')
      .stop(true,true)
      .animate({
	scrollTop: $("#messages").prop("scrollHeight")
      }, 800);
    console.log(this.state);
    this.game.socket.emit('getQuestion', {state: this.state, goal: this.goal});
  }

  // Currently reveals literal card (will set up pragmatic cases later)
  answer(cellAskedAbout) {
    console.log('bot answering...');
    var selections = [cellAskedAbout];
    var msg = (this.fullMap[cellAskedAbout] == 'o' ?
	       'Yes, ' + cellAskedAbout + ' is safe' :
	       'No, ' + cellAskedAbout + ' is not safe');
    setTimeout(function() {
      this.game.socket.send(["answer", msg, 2500, "bot", this.role]
			    .concat(selections).join('.'));
    }.bind(this), 2500);
  }

  // click on the non-bombs that have been revealed
  // ask another Q if and only if this doesn't complete the round...
  reveal(selections) {
    console.log('bot revealing...');
    setTimeout(function() {
      let over = [];
      _.forEach(selections, id =>  {
	if(this.fullMap[id] == 'o')
	  over.push(this.game.revealCell($('#button-' + id)));
      });
      if(!_.includes(over, true)) {
	this.ask();
      }
    }.bind(this), 2500);
  }

  update(state) {
    this.state = _.clone(state);
  }
}

module.exports = Bot;
