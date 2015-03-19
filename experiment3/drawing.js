

var drawScreen = function(game, player) {
    //clear background
    game.ctx.fillStyle = "#212121";
    game.ctx.fillRect(0,0,game.viewport.width-1,game.viewport.height-1);
    if (player.message) {
        // Draw message in center (for countdown, e.g.)
        game.ctx.font = "bold 23pt Helvetica";
        game.ctx.fillStyle = 'red';
        game.ctx.textAlign = 'center';
        wrapText(game, player.message, 
          game.world.width/2, game.world.height/4,
          game.world.width*4/5,
          25);
    } else {
      drawQuestionBox(game, player)
      drawGoals(game, player);   
      drawAnswerLine(game,player) 
      drawWords(game, player)
      drawSendButton(game, player)
    }
}

var drawSendButton = function(game, player) {
  var but = game.sendQuestionButton;
  game.ctx.fillStyle = '#61e6ff'
  game.ctx.fillRect(but.tlX + player.questionBoxAdjustment, but.tlY, but.width, but.height)
  game.ctx.strokeStyle = "#000000"
  game.ctx.lineWidth=4;
  game.ctx.strokeRect(but.tlX + player.questionBoxAdjustment, but.tlY, but.width, but.height)
  game.ctx.textAlign = 'center';
  game.ctx.textBaseline="middle"; 
  game.ctx.fillStyle = '#000000'
  game.ctx.fillText("Send", but.tlX + but.width/2 + player.questionBoxAdjustment, but.tlY + but.height/2)
}

var drawWords = function(game, player) {
  game.ctx.font = "12pt Helvetica";
  game.ctx.fillStyle = 'red'
  game.ctx.textAlign = 'left';
  game.ctx.textBaseline="top"; 
  game.ctx.lineWidth=2;
  game.ctx.strokeStyle = "#000000"
  game.ctx.fillStyle = "#000000"

  _.map(game.words, function(word) { 
    game.ctx.strokeRect(word.trueX, word.trueY - word.height/5, word.width, word.height*1.1)
    game.ctx.fillText(word.content, word.trueX, word.trueY)
  })
}


var initializeWords = function(game, player, x, y, maxWidth, lineHeight) {
  game.ctx.font = "12pt Helvetica";
  game.ctx.fillStyle = 'red'
  game.ctx.textAlign = 'left';
  game.ctx.textBaseline="top"; 
  var line = "";
  var words = game.words;
  accumulatedWidth = 0;
  currX = x;
  currY = y;
  for (var n = 0; n < words.length; n++) {
    var testWord = words[n].content
    var testWidth = accumulatedWidth + words[n].width
    // Bump up to next line if it doesn't fit...
    if (testWidth > maxWidth) {
      accumulatedWidth = 0;
      currY -= lineHeight;
      currX = x;
    } 
    // Set X & Y so we can grab onto 'em later
    words[n].origX = currX + player.questionBoxAdjustment
    words[n].origY = currY
    words[n].trueX = currX + player.questionBoxAdjustment
    words[n].trueY = currY

    // Draw & get ready for next word
    game.ctx.fillText(testWord, currX, currY);
    accumulatedWidth += words[n].width;
    currX += words[n].width      

  }
}

var drawQuestionBox = function(game, player) {
  game.ctx.fillStyle = "#F2E7DE"
  var x = game.questionBox.tlX + player.questionBoxAdjustment
  var y = game.questionBox.tlY;
  game.ctx.fillRect(x, y, game.questionBox.width, game.questionBox.height)

  game.ctx.textAlign="center";
  game.ctx.font = "18pt Futura";
  game.ctx.fillStyle = "black"
  game.ctx.fillText("Question Box", x + game.questionBox.width / 2, y + 25);
}

var drawAnswerLine = function(game, player) {
  game.ctx.strokeStyle = "#696969"
  game.ctx.fillStyle = "#696969"

  game.ctx.beginPath();
  game.ctx.lineWidth = 3;
  game.ctx.moveTo(game.answerLine.startX + player.questionBoxAdjustment, game.answerLine.y);
  game.ctx.lineTo(game.answerLine.endX + player.questionBoxAdjustment, game.answerLine.y);
  game.ctx.stroke();
}


var drawGoals = function(game, player) {
  console.log("drawing goals")
  _.map(game.goals, function(obj) { 
    if(player.role == "guesser") {
      game.ctx.drawImage(obj.img, obj.trueY, obj.trueX, obj.width, obj.height)
    } else {
      game.ctx.drawImage(obj.img, obj.trueX, obj.trueY, obj.width, obj.height)
    }
  })
}

function wrapText(game, text, x, y, maxWidth, lineHeight) {
  var cars = text.split("\n");
  game.ctx.fillStyle = 'white'
  game.ctx.fillRect(0, 0, game.viewport.width, game.viewport.height);
  game.ctx.fillStyle = 'red'

  for (var ii = 0; ii < cars.length; ii++) {

    var line = "";
    var words = cars[ii].split(" ");

    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + " ";
      var metrics = game.ctx.measureText(testLine);
      var testWidth = metrics.width;

      if (testWidth > maxWidth) {
        game.ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    game.ctx.fillText(line, x, y);
    y += lineHeight;
  }
}
