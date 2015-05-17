// Run as:
// webppl simulations/clark.js --require-js ./qa.js


// Question: "Does Jim Beam cost more than $5?"

// The merchants give the (over-informative) exact price of liquor
// more often when he prefaced the question with "I'd like to buy some
// whiskey" than when he prefaced the question with "I only have $5 to
// spend."

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

var timeDiff = function(timeString1, timeString2) {
  var min1 = timeString1.split(":")[1]
  var min2 = timeString2.split(":")[1]
  return Math.abs(min2 - min1)
}

var allTrue = function(boolList) {
  return reduce(function(val, memo) {
    return val && memo;
  }, true, boolList)
}

var allFalse = function(boolList) {
  return reduce(function(val, memo) {
    return !val && memo;
  }, true, boolList)
}

// --------------------------------------------------------------------

// var buyWhiskeyContext = "I'd like to buy some whiskey.";
// var spendFiveDollarsContext = "I only have $5 to spend.";

var currTimes = map(function(n) {return "3:" + n;}, _.range(30, 60))

var appointmentContext = "I have an appointment at 4:00.";

// World state is just the true current time
var worldPrior = function(){
  return uniformDraw(currTimes)
};

var timeQuestion = "What time is it?";

// projects from a world to the relevant properties for the desired answer
var timeQuestionMeaning = function(world){
  return world
};

var questions = [timeQuestion] 

var questionPrior = function(){
  return uniformDraw(questions);
};

// saying inexact times is easier?
var answerPrior = function(){
   var time = uniformDraw(currTimes)
   return time
};

// rather than true/false, the time answer meaning returns 
// a score that can be used in a factor statement
var timeAnswerMeaning = function(currTime){
  return function(questionMeaning){
    return function(world){
      return timeDiff(currTime, world)
    };
  };
};

var meaning = function(utterance){
  return (_.contains(currTimes, utterance) ? timeAnswerMeaning(utterance) :
         (utterance === timeQuestion) ? timeQuestionMeaning :
         console.error('unknown utterance!', utterance));
};

var literalListener = cache(function(question, answer){
  return Enumerate(function(){
    var world = worldPrior();
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    factor(- answerMeaning(questionMeaning)(world));
    return world;
  });
});

var literalAnswerer = cache(function(question, trueWorld){
  return Enumerate(
    function(){
      var answer = answerPrior();
      var ll = literalListener(question, answer)
      factor(literalListener(question, answer).score([], trueWorld) * 3);
      return answer;
    }
  );
});

var qudAll = function(world){return qa.pickAllNewspaperCafes(world)}
var qudClosest = function(world){return qa.pickClosestNewspaperCafe(world);};

var qudPrior = function(context){
  var p = ((context === businesspersonContext) ? 0.9 :
           (context === touristContext) ? 0.1 :
           console.error('unknown context'));
  return (flip(p) ? "qudAll" :
          "qudClosest");
};

var nameToQUD = function(qudName){
  return (qudName == "qudClosest" ? qudClosest :
          qudName == "qudAll" ? qudAll :
          console.error('unknown qud name', qudName));
};

var questioner = function(qudName) {
  var qud = nameToQUD(qudName);
  return Enumerate(function(){
    var question = questionPrior();
    var prior = Enumerate(function(){
      return qud(worldPrior());
    });
    var expectedKL = mean(
      function(){
        // What do I expect the world to be like?
        var trueWorld = worldPrior();
        // If I ask this question, what answer do I expect to get,
        // given what the world is like?
//        qa.printERP(literalAnswerer(question, trueWorld))
        var answer = sample(literalAnswerer(question, trueWorld));
        var posterior = Enumerate(function(){
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under
          // this new distribution on worlds?
          return qud(world);
        });
        return qa.KL(posterior, prior);
      });
    factor(expectedKL * 3);
    
    return question;
  });
};

var pragmaticAnswerer = function(context, question, trueWorld){
  var qudPosterior = Enumerate(function(){
    var qudName = qudPrior(context);
    var qud = nameToQUD(qudName);
    var q_erp = questioner(qudName);
    factor(q_erp.score([], question));
    return qudName;
  });
//  qa.printERP(qudPosterior)
  return Enumerate(function(){
    var qudName = sample(qudPosterior);
    var qud = nameToQUD(qudName);
    // Pick answer conditioned on communicating question predicate value
    var truthfulAnswerPrior = Enumerate(function(){
      var answer = answerPrior();
      factor(literalListener(question, answer).score([], trueWorld));
      return answer
    })
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        return (_.isEqual(qud(trueWorld), qud(inferredWorld))) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * 10);
    return answer;
  });
};


var world = "3:41"

qa.printERP(literalAnswerer(timeQuestion, world))

// world = {'cafe1' : [3, false],
//          'cafe2' : [1, true],
//          'cafe3' : [3, true],
//          'cafe4' : [3, true]}

// console.log("world", world);

// console.log(businesspersonContext, newspaperQuestion);
// qa.printERP(pragmaticAnswerer(businesspersonContext, newspaperQuestion, world));

// console.log(touristContext, newspaperQuestion);
// qa.printERP(pragmaticAnswerer(touristContext, newspaperQuestion, world));

