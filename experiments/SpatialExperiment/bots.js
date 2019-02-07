class Bot {
  constructor(game, data) {
    this.game = game;
    this.role = data.currStim.role == 'helper' ? 'leader' : 'helper';
    this.fullMap = data.currStim.underlying;
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
    var code = 'A2';
    setTimeout(function() {
      this.game.socket.send(["question", code, 5000, 'bot', this.role].join('.'));
    }.bind(this), 5000);
  }

  // Currently reveals literal card (will set up pragmatic cases later)
  answer(cellAskedAbout) {
    console.log('bot answering...');
    var selections = [cellAskedAbout];
    var msg = (this.fullMap[cellAskedAbout] == 'g' ?
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
	if(this.fullMap[id] == 'g')
	  over.push(this.game.revealCell($('#button-' + id)));
      });
      if(!_.includes(over, true)) {
	this.ask();
      }
    }.bind(this), 2500);
  }
}

module.exports = Bot;
