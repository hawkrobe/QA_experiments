var drawScreen = function(game, player) {
    //clear background
    wipeRegion(
      game.questionBox.tlX + player.questionBoxAdjustment,
      game.questionBox.tlY,
      game.questionBox.width,game.questionBox.height);

    if (player.message) {
        // Draw message in center (for countdown, e.g.)
        game.ctx.fillStyle = 'white'
        game.ctx.fillRect(0, 0, game.viewport.width, game.viewport.height);
        setBlankScreenTextStyle();
        wrapText(game, player.message, 
          game.viewport.width/2, game.viewport.height/4,
          game.viewport.width*4/5,
          25*game.ratio);
    } else if (game.player_count > 1) {
      drawMessages(game, player)
      drawQuestionBox(game, player)
      drawAnswerLine(game, player)
      drawWords(game, player)
      drawGoals(game, player)
      if( player.role == "guesser" || game.phase == 2)  // Only draw send button for guesser
        drawSendButton(game, player)
      if (player.role == "guesser" && game.phase == 0)
        initialWheelDraw(game)
      if (player.role == "helper" || game.phase <= 3) 
        drawMysteryGates(game, player)

    }
}

var wipeRegion = function(tlx, tly, width, height) {
  var tempStyle = game.ctx.fillStyle;
  game.ctx.fillStyle = "#212121";
  game.ctx.fillRect(
    tlx, tly, width, height);
  game.ctx.fillStyle = tempStyle;
}

var wipeBorder = function(tlx, tly, width, height) {
  var tempStyle = game.ctx.strokeStyle;
  game.ctx.strokeStyle = "#212121";
  game.ctx.strokeRect(
    tlx, tly, width, height);
  game.ctx.strokeStyle = tempStyle;
}

var drawSendButton = function(game, player) {
  var but = game.sendQuestionButton;
  but.tlY = player.role === "helper" ? game.ratio * 365 : but.tlY
  game.ctx.fillStyle = '#61e6ff'
  game.ctx.fillRect(but.tlX + player.questionBoxAdjustment, but.tlY, but.width, but.height)
  game.ctx.strokeStyle = "#000000"
  game.ctx.lineWidth=4;
  game.ctx.strokeRect(but.tlX + player.questionBoxAdjustment, but.tlY, but.width, but.height)
  setSendButtonStyle();
  game.ctx.fillText("Send", but.tlX + but.width/2 + player.questionBoxAdjustment, but.tlY + but.height/2)
}

var drawWords = function(game, player) {
  setQuestionWordStyle();
  _.map(game.words, function(word) { 
    game.ctx.strokeRect(word.trueX, word.trueY - word.height/5, word.width, word.height*1.1)
    game.ctx.fillText(word.content, word.trueX, word.trueY)
  })
}

var drawQuestionBox = function(game, player) {
  game.ctx.fillStyle = "#F2E7DE"
  var x = game.questionBox.tlX + player.questionBoxAdjustment
  var y = game.questionBox.tlY;
  game.ctx.fillRect(x, y, game.questionBox.width, game.questionBox.height)

  setQuestionBoxStyle()
  game.ctx.fillText("Question Box", x + game.questionBox.width / 2, y + game.ratio * 15);
}

var drawAnswerLine = function(game, player) {
  game.ctx.strokeStyle = "#696969"
  game.ctx.fillStyle = "#696969"

  game.ctx.beginPath();
  game.ctx.lineWidth = 3;
  game.ctx.moveTo(game.answerLine.startX + player.questionBoxAdjustment, game.answerLine.y);
  game.ctx.lineTo(game.answerLine.endX + player.questionBoxAdjustment, game.answerLine.y);
  game.ctx.stroke();

  game.ctx.fillText("?", game.answerLine.endX + player.questionBoxAdjustment + 10 * game.ratio, 
    game.answerLine.y - 40 * game.ratio)
}

var drawGoals = function(game, player) {
  setWhiteMessageTextStyle()
  game.ctx.textAlign = "center"

  if(player.role == "guesser") {
    game.ctx.fillText("Your view of the gates:", game.halfwayPoint + game.viewport.width/2, game.ratio * 15)
    game.ctx.textAlign = "center"
    game.ctx.fillText("Your goal is to find the...", 
		      game.halfwayPoint, game.ratio * 400)
  } else {
    var goals = game.goals
    game.ctx.fillText("Your view:", game.halfwayPoint + game.viewport.width/2, game.ratio * 15)
    game.ctx.fillText("Partner's view:", game.viewport.width/2 - game.halfwayPoint, game.ratio * 15)
    _.map(goals, function(obj) { 
      game.ctx.drawImage(obj.img, obj.trueX, obj.trueY, obj.width, obj.height)
    })    

  }
}

var drawMessages = function(game, player) {
  var text = getText(game, player)
  if(player.role == "guesser") {
    wipeRegion(0, game.ratio*500,
	       game.halfwayPoint * 2,
	       game.ratio * 30 * 2);
    setWhiteMessageTextStyle()
    // Temp message... 
    wrapText(game, text,
	     game.halfwayPoint, game.ratio*500,
	     game.halfwayPoint * 2, game.ratio*30)
  } else {
      // Temp message:
    wipeRegion(0, game.ratio*325,
	       game.halfwayPoint*2, game.ratio * 30 * 2.1);
      setWhiteMessageTextStyle()
      wrapText(game, text,
               game.halfwayPoint, game.ratio*325,
               game.halfwayPoint * 2, game.ratio*30)
    }
}

// Phase 0 is waiting for goal to display...
// Phase 1 is guesser selecting question
// Phase 2 is helper selecting answer
// Phase 3 is guesser picking gate
// Phase 4 is both players seeing result
var getText = function(game, player) {
  var role = player.role
  var phase = game.phase
  if (role == "guesser" && phase == 1) {
    return "Drag the words onto the line to ask the helper one question"
  } else if(role == "guesser" && phase == 2) {
    return "Waiting for other player to respond..."
  } else if (role == "guesser" && phase == 3) {
    return "Now click a gate above to guess where it is"
  } else if (role == "helper" && phase < 2) {
    return "Waiting for other player to ask a question... \n Watch the box below."
  } else if (role == "helper" && phase == 2) {
    return "Click the gate you want to reveal!"
  } else if (role == "helper" && phase == 3) {
    return "Waiting for other player to guess..."
  } else if (phase == 4) {
    var correct = game.gatePicked == game.goalNum 
    if(!correct && role == "helper")
      return "They were looking for the " + game.goal.name + " but they incorrectly guessed gate " + (parseInt(game.gatePicked) + 1) + "."
    else if (correct && role == "helper")
      return "They were looking for the " + game.goal.name + " and they guessed correctly!"
    else if (!correct && role == "guesser")
      return "Incorrect -- the " + game.goal.name + " was behind gate " + (game.goalNum + 1) + "."
    else if (correct && role == "guesser")
      return "Correct! Great job!"
  } else {
    return ""
  }
}

var drawMysteryGates = function(game, player) {
  var yLoc = game.ratio * 50
  var xLocs = player.gateXLocs
  _.map([1,2,3,4], function(num) {
    var imgObj = new Image()
    imgObj.src = "stimuli/gate" + num + ".jpg"
    // Set it up to load properly
    var x = xLocs[num-1] - 100
    var y = yLoc

    imgObj.onload = function(){
      game.ctx.drawImage(imgObj, x, y, 200, 200)
    }
  })
}

function revealAnswer(game, player, objPicked) {
  drawMessages(game, player)
  if(player.role === "guesser") {
//    wipeRegion(0, game.ratio * 50, game.viewport.width, 200)
    _.map(_.zip(game.goals, player.gateXLocs), function(pair) {
      var obj = pair[0]
      game.ctx.drawImage(obj.img, pair[1] - 100, game.ratio * 50, 200, 200)
    })
  }
  if( game.gatePicked != game.goalNum ) {
    placeX(player, game.gatePicked)
  }
}

function placeX(player, num) {
  var xLocs = player.gateXLocs
  game.ctx.beginPath();
  game.ctx.lineWidth = 8;
  game.ctx.strokeStyle = "red"
  game.ctx.moveTo(xLocs[num] - 100, game.ratio * 50);
  game.ctx.lineTo(xLocs[num] + 100, game.ratio * 50 + 200);
  game.ctx.moveTo(xLocs[num] + 100, game.ratio * 50);
  game.ctx.lineTo(xLocs[num] - 100, game.ratio * 50 + 200);
  game.ctx.stroke();
}

function highlightGate(num, prevSelected) {
  if(_.isNumber(prevSelected)) {
    prevGoal = game.goals[prevSelected]
    wipeBorder(prevGoal.trueX - game.ctx.lineWidth, prevGoal.trueY - game.ctx.lineWidth, 
      prevGoal.width + 2*game.ctx.lineWidth, prevGoal.height + 2*game.ctx.lineWidth)
//    wipeBorder(prevGoal.trueX - game.ctx.lineWidth, prevGoal.trueY - game.ctx.lineWidth + 300, 
//      prevGoal.width + 2*game.ctx.lineWidth, prevGoal.height + 2*game.ctx.lineWidth)
  }
  currGoal = game.goals[num]
  game.ctx.strokeStyle = "red"
  game.ctx.lineWidth = 8
  game.ctx.strokeRect(currGoal.trueX - game.ctx.lineWidth, currGoal.trueY - game.ctx.lineWidth, 
    currGoal.width + 2*game.ctx.lineWidth, currGoal.height + 2*game.ctx.lineWidth)
//  game.ctx.strokeRect(currGoal.trueX - game.ctx.lineWidth, currGoal.trueY - game.ctx.lineWidth + 300, 
//      currGoal.width + 2*game.ctx.lineWidth, currGoal.height + 2*game.ctx.lineWidth)

}

// function animateBorder(game, player, totalRotations, endNumber, prevNum, target) {
//   // Want to select DIFFERENT random one than previous...
//   var currNum = Math.floor(Math.random() * 4)
//   while (currNum == prevNum)
//     var currNum = Math.floor(Math.random() * 4)
//   var currGoal = game.goals[currNum]
//   game.ctx.strokeStyle = "red"
//   game.ctx.lineWidth = 8
//   game.ctx.strokeRect(currGoal.trueX - game.ctx.lineWidth, currGoal.trueY - game.ctx.lineWidth, 
//     currGoal.width + 2*game.ctx.lineWidth, currGoal.height + 2*game.ctx.lineWidth)
//   if(totalRotations < endNumber) {
//     setTimeout(function(){
//       wipeBorder(currGoal.trueX - game.ctx.lineWidth, currGoal.trueY - game.ctx.lineWidth, 
//         currGoal.width + 2*game.ctx.lineWidth, currGoal.height + 2*game.ctx.lineWidth)
//       animateBorder(game, player, totalRotations + 1, endNumber, currNum)
//     }, 250)
//   } else {
//     setTimeout(function(){
//       // Erase old goal
//       wipeBorder(currGoal.trueX - game.ctx.lineWidth, currGoal.trueY - game.ctx.lineWidth, 
//         currGoal.width + 2*game.ctx.lineWidth, currGoal.height + 2*game.ctx.lineWidth)
//       // Highlight final goal
//       finalGoal = game.goals[_.indexOf(game.goals, game.goal)]
//       game.ctx.strokeStyle = "red"
//       game.ctx.strokeRect(finalGoal.trueX - game.ctx.lineWidth, finalGoal.trueY - game.ctx.lineWidth, 
//         finalGoal.width + 2*game.ctx.lineWidth, finalGoal.height + 2*game.ctx.lineWidth)
//       // Write text of final goal
//       game.ctx.font = "36pt Helvetica";
//       game.ctx.textAlign = "left"
//       game.ctx.fillStyle = "red"
//       game.ctx.fillText(finalGoal.name + "!", 
//         game.questionBox.tlX + player.questionBoxAdjustment + game.ratio*100, game.ratio*150)
//       setTimeout(function() {
//         setWhiteMessageTextStyle()
//         game.socket.send("advance")
//       }, 1000)
//     }, 250)
//   }
// }

var initializeWords = function(game, player, x, y, maxWidth, lineHeight) {
  setQuestionWordStyle();
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

function wrapText(game, text, x, y, maxWidth, lineHeight) {
  var cars = text.split("\n");

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

function setWhiteMessageTextStyle() {
  game.ctx.textAlign = "center"
  game.ctx.textBaseline='top'
  game.ctx.fillStyle = "white"
  game.ctx.font = "36pt Helvetica";
}

function setQuestionBoxStyle() {
  game.ctx.textAlign="center";
  game.ctx.font = "36pt Futura";
  game.ctx.fillStyle = "black"
};

function setQuestionWordStyle() {
  game.ctx.font = "24pt Helvetica";
  game.ctx.textAlign = 'left';
  game.ctx.textBaseline="top"; 
  game.ctx.strokeStyle = "#000000"
  game.ctx.fillStyle = "#000000"
  game.ctx.lineWidth=4;
}

function setSendButtonStyle() {
  game.ctx.textAlign = 'center';
  game.ctx.textBaseline="middle"; 
  game.ctx.fillStyle = '#000000'
  game.ctx.font = "24pt Helvetica";
}
function setBlankScreenTextStyle() {
  game.ctx.font = "bold 46pt Helvetica";
  game.ctx.fillStyle = 'red';
  game.ctx.textAlign = 'center';  
}
