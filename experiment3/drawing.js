

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
    }
}

var drawQuestionBox = function(game, player) {
  game.ctx.fillStyle = "#F2E7DE"
  var playerAdjust = player.role === "guesser" ? 75 : 0;
  var x = game.questionBox.tlX + playerAdjust
  var y = game.questionBox.tlY;
  game.ctx.fillRect(x, y, game.questionBox.width, game.questionBox.height)

  game.ctx.textAlign="center";
  game.ctx.font = "18pt Futura";
  game.ctx.fillStyle = "black"
  game.ctx.fillText("Question Box", x + game.questionBox.width / 2, y + 25);

}

var drawGoals = function(game, player) {
  console.log("drawing goals")
  _.map(game.goals, function(obj) { 
    if(player.role == "guesser") {
      game.ctx.drawImage(obj.img, obj.trueY, obj.trueX, obj.width, obj.height)
    } else {
      game.ctx.drawImage(obj.img, obj.trueX, obj.trueY, obj.width, obj.height)
    }
    game.ctx.lineWidth = 7;
    game.ctx.strokeStyle = 'red';
    game.ctx.stroke();
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
