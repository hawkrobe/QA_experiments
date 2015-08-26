---
layout: page
title: Clark (1979) -- whiskey answers
status: current
---

Depending on the context, liquor merchants will be more or less likely to give over-informative answers. Our model accounts for this via inference about the underlying goal, given the context.

~~~~
///fold:
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

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};

///

var buyWhiskeyContext = "I'd like to buy some whiskey.";
var spendFiveDollarsContext = "I only have $5 to spend.";

var prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var isNumeric = function(x){
  return _.contains(prices, x);
};

var worldPrior = function(){
  return [uniformDraw(prices)];
};

var price = function(world){
  return world[0];
};

var isMoreThanFiveQuestion = "Does Jim Beam cost more than $5?";

var isMoreThanFiveQuestionMeaning = function(world){
  return price(world) < 5;
};

var questions = [isMoreThanFiveQuestion];

var questionPrior = function(){
  return uniformDraw(questions);
};

var literalAnswers = ["yes, the whiskey costs more than $5", "no, the whiskey costs less than $5"];

var priceAnswers = map(function(p) {return "the whiskey costs $" + p;}, prices);

var answerPrior = function(){
  // evenly distribute probability across response types
  return flip(0.5) ? uniformDraw(literalAnswers) : uniformDraw(priceAnswers);
};

var makeTruthfulAnswerPrior = function(trueWorld) {
  var truthfulAnswerPrior = Enumerate(function(){
    var answer = answerPrior();
    factor(interpreter(answer).score([], trueWorld));
    return answer;
  });
  return truthfulAnswerPrior;
};

var numericAnswerMeaning = function(number){
  return function(world){
    return price(world) == number;
  };
};

var booleanAnswerMeaning = function(bool){
  return function(world){
    return (price(world) > 5) == bool;
  };
};

var meaning = function(utterance){
  return ((utterance === "yes, the whiskey costs more than $5") ? booleanAnswerMeaning(true) :
          (utterance === "no, the whiskey costs less than $5") ? booleanAnswerMeaning(false) :
          (utterance === isMoreThanFiveQuestion) ? isMoreThanFiveQuestionMeaning :
          _.contains(priceAnswers, utterance) ? numericAnswerMeaning(last(utterance.split('$'))*1) :
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

var qudPrice = function(world){return price(world);};
var qudPriceGreaterThan5 = function(world){return price(world) > 5;};

var qudPrior = function(context){
  var p = ((context === buyWhiskeyContext) ? 0.5 :
           (context === spendFiveDollarsContext) ? 0.99 :
           console.error('unknown context'));
  return (flip(p) ? "qudPriceGreaterThan5" : "qudPrice");
};

var nameToQUD = function(qudName){
  return (qudName == "qudPriceGreaterThan5" ? qudPriceGreaterThan5 :
          qudName == "qudPrice" ? qudPrice :
          qudName == isMoreThanFiveQuestion ? isMoreThanFiveQuestionMeaning :
          console.error('unknown qud name', qudName));
};

var explicitAnswerer = cache(function(question, trueWorld, rationality) {
  var qud = nameToQUD(question);
  return Enumerate(function(){
    var truthfulAnswerPrior = makeTruthfulAnswerPrior(trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(function(){
      var inferredWorld = sample(interpreter(answer));
      var inferredVal = qud(inferredWorld);
      var trueVal = qud(trueWorld);
      return (_.isEqual(trueVal, inferredVal) ? 1 : 0);
    });
    factor(Math.log(score) * rationality);
    return answer;
  });
});

var explicitQuestioner = cache(function(qudName, rationality) {
  var qud = nameToQUD(qudName);
  return Enumerate(function(){
    var question = questionPrior();
    var prior = Enumerate(function(){
      return qud(worldPrior());});
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
});

var pragmaticAnswerer = function(context, question, trueWorld, rationality){
  var qudPosterior = Enumerate(function(){
    var qudName = qudPrior(context);
    var qud = nameToQUD(qudName);
    var q_erp = explicitQuestioner(qudName, rationality);
    factor(q_erp.score([], question));
    return qudName;
  });
  return Enumerate(function(){
    var qud = nameToQUD(sample(qudPosterior));
    var truthfulAnswerPrior = makeTruthfulAnswerPrior(trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(interpreter(answer));
        return (qud(trueWorld) == qud(inferredWorld)) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * rationality);
    return answer;
  });
};

var world = [4];

print(buyWhiskeyContext + " " + isMoreThanFiveQuestion);
print(pragmaticAnswerer(buyWhiskeyContext, isMoreThanFiveQuestion, world, 1));

print(spendFiveDollarsContext + " " + isMoreThanFiveQuestion);
print(pragmaticAnswerer(spendFiveDollarsContext, isMoreThanFiveQuestion, world, 1));

~~~~
