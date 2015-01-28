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

// --------------------------------------------------------------------

var buyWhiskeyContext = "I'd like to buy some whiskey.";
var spendFiveDollarsContext = "I only have $5 to spend.";

var prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var isNumeric = function(x){
  return _.contains(prices, x);
};

var worldPrior = function(){
  return [flip(0.5), uniformDraw(prices)];
};

var credit = function(world){
  return world[0];
};

var price = function(world){
  return world[1];
};

var isMoreThanFiveQuestion = "Does Jim Beam cost more than $5?";
var isMoreThanFiveQuestionMeaning = function(world){
  return price(world) <= 5;
};

var doYouTakeCreditQuestion = "Do you take credit cards?";
var doYouTakeCreditQuestionMeaning = function(world){
  return credit(world);
};

var questions = [isMoreThanFiveQuestion, doYouTakeCreditQuestion];

var questionPrior = function(){
  return uniformDraw(questions);
};

var answerPrior = function(){
  // prefer yes/no over detailed answer
  return flip(0.5) ? uniformDraw(["yes", "no"]) : uniformDraw(prices);
};

var numericAnswerMeaning = function(number){
  return function(questionMeaning){
    return function(world){
      if (questionMeaning == isMoreThanFiveQuestionMeaning){
        return price(world) == number;
      } else {
        return true; // vacuous
      }
    };
  };
};

var booleanAnswerMeaning = function(bool){
  return function(questionMeaning){
    return function(world){
      if (questionMeaning == isMoreThanFiveQuestionMeaning){
        return (price(world) > 5) == bool;
      } else {
        return credit(world) == bool;
      }
    }
  }
}

var meaning = function(utterance){
  return ((utterance === "yes") ? booleanAnswerMeaning(true) :
          (utterance === "no") ? booleanAnswerMeaning(false) :
          isNumeric(utterance) ? numericAnswerMeaning(utterance) :
          (utterance === isMoreThanFiveQuestion) ? isMoreThanFiveQuestionMeaning :
          (utterance === doYouTakeCreditQuestion) ? doYouTakeCreditQuestionMeaning :
          console.error('unknown utterance!', utterance));
};

var literalListener = cache(function(question, answer){
  return Enumerate(function(){
    var world = worldPrior();
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
});

var literalAnswerer = cache(function(question, trueWorld){
  return Enumerate(
    function(){
      var answer = answerPrior();
      factor(literalListener(question, answer).score([], trueWorld) * 3);
      return answer;
    }
  );
});

var qudPrice = function(world){return price(world);};
var qudPriceGreaterThan5 = function(world){return price(world) > 5;};
var qudTakeCredit = function(world){return credit(world);};

var qudPrior = function(context){
  var p = ((context === buyWhiskeyContext) ? 0.5 :
           (context === spendFiveDollarsContext) ? 0.9 :
           console.error('unknown context'));
  return (flip(0.4) ? "qudTakeCredit" :
          flip(p) ? "qudPriceGreaterThan5" :
          "qudPrice");
};

var nameToQUD = function(qudName){
  return (qudName == "qudPriceGreaterThan5" ? qudPriceGreaterThan5 :
          qudName == "qudPrice" ? qudPrice :
          qudName == "qudTakeCredit" ? qudTakeCredit :
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
  return Enumerate(function(){
    var qudName = sample(qudPosterior);
    var qud = nameToQUD(qudName);
    // Pick answer conditioned on communicating question predicate value
    var answer = answerPrior();
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        return (qud(trueWorld) == qud(inferredWorld)) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * 3);
    return answer;
  });
};

var world = [true, 4];
console.log("world", world);

console.log(buyWhiskeyContext, doYouTakeCreditQuestion);
qa.printERP(pragmaticAnswerer(buyWhiskeyContext, doYouTakeCreditQuestion, world));

console.log(spendFiveDollarsContext, doYouTakeCreditQuestion);
qa.printERP(pragmaticAnswerer(spendFiveDollarsContext, doYouTakeCreditQuestion, world));

console.log(buyWhiskeyContext, isMoreThanFiveQuestion);
qa.printERP(pragmaticAnswerer(buyWhiskeyContext, isMoreThanFiveQuestion, world));

console.log(spendFiveDollarsContext, isMoreThanFiveQuestion);
qa.printERP(pragmaticAnswerer(spendFiveDollarsContext, isMoreThanFiveQuestion, world));
