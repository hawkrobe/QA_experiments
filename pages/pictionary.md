---
layout: page
title: Playing Pictionary with RSA (Rational Sketch Act) model
status: other
---

We obviously want to make a robot that can play pictionary with another robot.

To do so, we adopt a visual analogy to the Rational Speech Act model (Frank and Goodman, 2012; Goodman and Stuhlmuller, 2013), which we call the Rational Sketch Act model.

We'll begin with a simplified version of the game, where there are only two goal objects: a circle and a square. The sketcher draws one of these goals out of a hat and attempts to get the guesser to choose it. We contrast two possible models of the sketcher: a *literal sketcher*, who simply attempts to minimize the distance between the sketch and the true object, and a *pragmatic sketcher*, who reasons about a guesser and attempts to maximize the likelihood that the guesser picks the correct object. Crucially, the pragmatic sketcher takes alternative possibilities into account.

~~~~
///fold:
var drawCurves = function(drawObj, splines){
  var curve = splines[0];
  drawObj.drawSpline(curve[0], curve[1], curve[2], curve[3], curve[4], curve[5]);
  if (splines.length > 1) {
    drawCurves(drawObj, splines.slice(1));
  }
};

var makeSplines = function(n, splines){
  // Add a curve line to the set of curves
  var startX = uniform(10,60);
  var startY = uniform(10,60);
  var midX = uniform(10,60);
  var midY = uniform(10,60);
  var endX = uniform(10,60);
  var endY = uniform(10,60);
  var newSplines = splines.concat([[startX, startY,
                                    midX, midY,
                                    endX, endY]]);
  // Repeat until you have the desired number
  return (n==1) ? newSplines : makeSplines(n-1, newSplines);
};
											    
var possibleGuesses = ["circle", "box"];
///

var splinePrior = function() {
  var numCurves = 4;
  return makeSplines(numCurves, []);
};

var guessPrior = function() {
  return uniformDraw(possibleGuesses);  
};

// tries to draw the sketch that maximizes the raw similarity to the goal object
var literalSketcher = function(goalObj) {
  var targetImg = Draw(70, 70, false);      // Load the target
  loadImage(targetImg, "/Q_and_A/assets/img/" + goalObj + ".png"); 
  return MH(function() {
    var splineParams = splinePrior();       // Sample a set of 1-5 curves
    var generatedImg = Draw(70, 70, true);  // Create a canvas to draw on
    drawCurves(generatedImg, splineParams); // Sketch the sample curves on the canvas
    factor(-targetImg.distance(generatedImg)/1000); // Weight by raw similarity to target
    return splineParams;
  }, 50);
};

var guesser = function(sketch) {
  return Enumerate(function() {
    var guess = guessPrior();
    var targetImg = Draw(70, 70, false);
    loadImage(targetImg, "/Q_and_A/assets/img/" + guess + ".png");
    factor(-targetImg.distance(sketch)/1000);
    return guess;
  });
};

var pragmaticSketcher = function(goalObj) {
  return MH(function() {
    var splineParams = splinePrior();       // Sample a set of 1-5 curves
    var generatedImg = Draw(70, 70, true);  // Create a canvas to draw on
    drawCurves(generatedImg, splineParams); // Sketch the sample curves on the canvas
    var guessERP = guesser(generatedImg);    // Query the *GUESSER* to get the likelihood 
    factor(guessERP.score([], goalObj));
    return splineParams;
  }, 500);
};

// Plot best sketch
var bestSplineParams = MAP(pragmaticSketcher("box")).val;
var generatedImg = Draw(70, 70, true);
var generatedImg = Draw(70, 70, true);
drawCurves(generatedImg, bestSplineParams);
~~~~

A sketcher, like a speaker, seeks to be informative about the topic (QUD) they're trying to convey. In pictionary, this topic is some object. The sketcher wants to draw a sketch that maximizes the likelihood that their partner will guess the correct object. In order to infer what this sketch might look like, they reason about what their partner will believe after seeing a sketch (i.e. P(object \| sketch)). To compute this conditional probability, we use the approach developed by Fan et al (2015) using a convolutional neural network (CNN) to investigate object representations in a visual production task. 

~~~~
///fold:
var drawCurves = function(drawObj, splines){
  var curve = splines[0];
  drawObj.drawSpline(curve[0], curve[1], curve[2], curve[3], curve[4], curve[5]);
  if (splines.length > 1) {
    drawCurves(drawObj, splines.slice(1));
  }
};

var makeSplines = function(n, splines){
  // Add a curve line to the set of curves
  var startX = uniform(10,60);
  var startY = uniform(10,60);
  var midX = uniform(10,60);
  var midY = uniform(10,60);
  var endX = uniform(10,60);
  var endY = uniform(10,60);
  var newSplines = splines.concat([[startX, startY,
                                    midX, midY,
                                    endX, endY]]);
  // Repeat until you have the desired number
  return (n==1) ? newSplines : makeSplines(n-1, newSplines);
};
											    
var possibleGuesses = ["snake", "elephant","lobster","couch","teapot","giraffe","harp","bell","train","motorbike","spoon","dolphin","fish","duck","hat","rabbit","helicopter","ladder","laptop","mouse (animal)","tiger","violin","bicycle","trumpet","shark","kangaroo","crab","cow","fork","pineapple","airplane","pig","van","mosquito","zebra","truck","hammer","bus","floor lamp","pear","seagull","guitar","table","crocodile","palm tree","frying-pan","cat","race car","suv","chair","cactus","socks","blimp","swan","horse","bed","shoe","sheep","ship","microphone","banana","tablelamp","bench","shovel"];

var splinePrior = function() {
  var numCurves = 4;
  return makeSplines(numCurves, []);
};

var guessPrior = function() {
  return uniformDraw(possibleGuesses);  
};


///

// tries to draw the sketch that maximizes the raw similarity to the goal object
var literalSketcher = function(goalObj) {
  return MH(function() {
    var splineParams = splinePrior();       // Sample a set of 1-5 curves
    var generatedImg = Draw(70, 70, true);  // Create a canvas to draw on
    drawCurves(generatedImg, splineParams); // Sketch the sample curves on the canvas
    var guesses = getGuesses(generatedImg); // Query the CNN to get the raw similarity score
    factor(guesses[goalObj]);               // Weight the sample based on score
    return splineParams;
  }, 50);
};

var guesser = function(sketch) {
  var possibleGuesses = getGuesses(sketch);
  return Enumerate(function() {
    var guess = guessPrior();
    factor(possibleGuesses[guess]);
    return guess;
  });
};

var pragmaticSketcher = function(goalObj) {
  return MH(function() {
    var splineParams = splinePrior();       // Sample a set of 1-5 curves
    var generatedImg = Draw(70, 70, true);  // Create a canvas to draw on
    drawCurves(generatedImg, splineParams); // Sketch the sample curves on the canvas
    var guessERP = guesser(generatedImg);    // Query the *GUESSER* to get the likelihood 
    factor(guessERP.score([], goalObj));
    return splineParams;
  }, 500);
};

// Plot best sketch
var bestSplineParams = MAP(pragmaticSketcher("giraffe")).val;
var generatedImg = Draw(70, 70, true);
var generatedImg = Draw(70, 70, true);
drawCurves(generatedImg, bestSplineParams);

~~~~
