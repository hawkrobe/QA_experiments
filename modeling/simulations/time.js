// Run as:
// webppl simulations/clark.js --require-js ./qa.js


///fold:
var identity = function(x){return x;};

var negate = function(predicate){
  return function(x){
    return !predicate(x);
  };
};

var condition = function(x){
  var score = x ? 0 : -Infinity;
  factor(score);
};

var mean = function(thunk){
  return expectation(Enumerate(thunk), function(v){return v;});
};

var KL = function(erpTrue, erpApprox){
  var values = erpTrue.support([]);
  var xs = map(
    function(value){
      var p = Math.exp(erpTrue.score([], value));
      var q = Math.exp(erpApprox.score([], value));
      if (p == 0.0){
	return 0.0;
      } else {
	return p * Math.log(p / q);
      }
    },
    values);
  return sum(xs);
};

var flatten = function(xs){
  if (xs.length == 0) {
    return [];
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
};

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};

var timeDiff = function(timeString1, timeString2) {
  var hr1 = timeString1.split(":")[0]
  var hr2 = timeString2.split(":")[0]
  var min1 = 60*hr1 + 1*timeString1.split(":")[1]
  var min2 = 60*hr2 + 1*timeString2.split(":")[1]
  return Math.abs(min2 - min1)
}

var getEveryFifthTime = function(list) {
  return filter(function(num) {
    return num[3] % 5 == 0;
  }, list);
};

var getNonFifthTimes = function(list) {
  return filter(function(num) {
    return num[3] % 5 != 0;
  }, list);
};

var roundToNearest = function(time) {
  var hour = time.split(":")[0]
  var minutes = time.split(":")[1]
  var roundedMinutes = 5 * Math.round(minutes / 5)
  return hour + ":" + roundedMinutes
}

///

//   ---------------
// | World knowledge |
//   ---------------

var times = map(function(n) {return "3:" + n;}, _.range(30, 60));

// World state is just the true current time
var worldPrior = function(){
  return uniformDraw(times)
};

//  -------------------
// | Question knowledge |
//  -------------------

var timeQuestion = "What time is it?";

// projects from a world to the relevant properties for the desired answer
var timeQuestionMeaning = function(world){
  return world
};

var questions = [timeQuestion]

var questionPrior = function(){
  return uniformDraw(questions);
};

//  -----------------
// | Answer knowledge |
//  -----------------

// saying rounded times is easier (b/c analog watches)
var answerPrior = function(){
  var ans = (flip(.25) ?
	     uniformDraw(getNonFifthTimes(times)) :
	     uniformDraw(getEveryFifthTime(times)));
  return ans;
};

var timeAnswerMeaning = function(currTime){
  return function(world){
    return timeDiff(currTime, world) == 0;
  };
};

//   -----------
// | Interpreter |
//   -----------

var meaning = function(utterance){
  return (_.contains(times, utterance) ? timeAnswerMeaning(utterance) :
	  (utterance === timeQuestion) ? timeQuestionMeaning :
	  console.error('unknown utterance!', utterance));
};

var interpreter = cache(function(answer){
  return Enumerate(function(){
    var world = worldPrior();
    var answerMeaning = meaning(answer);
    condition(answerMeaning(world));
    return world;
  });
});

//  ------
// | QUDs |
//  ------

var qudFactory = function(threshold) {
  return function(world){
    if(world < threshold) {
      return roundToNearest(world);
    } else {
      return world;
    }
  };
};

// Family of quds parameterized by threshold at which "running late"
// Thresholds closer to the appointment time (provided by context) are more likely
var qudPrior = function(context){
  var timeDiffs = map(function(time) {return timeDiff(time, context)},
		      times);
  var maxDiff = Math.max.apply(null, timeDiffs);
  var timeProbs = map(function(timeDiff) {return maxDiff - timeDiff;},
		      timeDiffs);
  var qudWord = (flip(0.25) ?
		 "Exact" :
		 categorical(timeProbs, times));
  return "qud" + qudWord;
};

var nameToQUD = function(qudName){
  if (qudName == timeQuestion) {
    return timeQuestionMeaning;
  } else if (qudName === "qudExact") {
    return (function(world) {return world;});
  } else {
    var threshold = qudName.slice(3);
    return qudFactory(threshold);
  }
};

//  -------
// | Models |
//  -------

var explicitAnswerer = cache(function(question, trueWorld, rationality) {
  var qud = nameToQUD(question);
  return Enumerate(function(){
    var answer = answerPrior();
    var score = mean(function(){
      var inferredWorld = sample(interpreter(answer));
      return (_.isEqual(qud(trueWorld), qud(inferredWorld)) ? 1 : 0);
    });
    factor(Math.log(score) * rationality);
    return answer;
  });
});

var explicitQuestioner = function(qudName, rationality) {
  var qud = nameToQUD(qudName);
  return Enumerate(function(){
    var question = questionPrior();
    var prior = Enumerate(function(){
      return qud(worldPrior());
    });
    var expectedKL = mean(function(){
      var trueWorld = worldPrior();
      var answer = sample(explicitAnswerer(question, trueWorld, rationality));
      var posterior = Enumerate(function(){
	var world = sample(interpreter(answer));
	return qud(world);
      });
      return KL(posterior, prior);
    });
    factor(expectedKL * rationality);
    return question;
  });
};

var pragmaticAnswerer = function(context, question, trueWorld, rationality){
  var qudPosterior = Enumerate(function(){
    var qudName = qudPrior(context);
    var qud = nameToQUD(qudName);
    var q_erp = explicitQuestioner(qudName, rationality);
    factor(q_erp.score([], question));
    return qudName;
  });
  return Enumerate(function(){
    var qudName = sample(qudPosterior);
    var qud = nameToQUD(qudName);
    var answer = answerPrior(); // note we DON'T use truthfulAnswerPrior here
    var score = mean(function(){
      var inferredWorld = sample(interpreter(answer));
      return (_.isEqual(qud(trueWorld), qud(inferredWorld))) ? 1.0 : 0.0;
    });
    factor(Math.log(score) * rationality);
    return answer;
  });
};

var appointmentContext = "4:00";

var runModel = function(group) {
  return mean(function(){
    var trueWorld = worldPrior();
    var ansERP = pragmaticAnswerer(appointmentContext, timeQuestion, trueWorld, 1);
    condition(group === "early" ?
	      trueWorld.slice(2) < 45 :
	      trueWorld.slice(2) > 45);
    return Math.exp(ansERP.score([], roundToNearest(trueWorld)));
  });
};

console.log("early rounds p = " + runModel("early"));
console.log("late rounds p = " + runModel("late"));

qa.writeCSV([["worldState", "answer", "modelProb"]], "timePredictions.csv");

qa.writeERP(pragmaticAnswerer(appointmentContext, timeQuestion, "3:34", 1),
	    ["3:34"], "timePredictions.csv");
qa.writeERP(pragmaticAnswerer(appointmentContext, timeQuestion, "3:54", 1),
	    ["3:54"], "timePredictions.csv");
map(function(v){qa.appendCSV([["3:34", v, 0]], "timePredictions.csv");},
    _.difference(times, ["3:33", "3:34", "3:35", "3:36", "3:37"]));

map(function(v){qa.appendCSV([["3:54", v, 0]], "timePredictions.csv");},
    _.difference(times, ["3:53", "3:54", "3:55", "3:56", "3:57"]));

