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
  return uniformDraw(prices);
};

var uniqueQuestion = "Does Jim Beam cost more than $5?";

var uniqueQuestionMeaning = function(world){
  return world <= 5;
};

var questionPrior = function(){
  return uniqueQuestion;
};

var answerPrior = function(){
  // prefer yes/no over detailed answer
  return flip(0.5) ? uniformDraw(["yes", "no"]) : uniformDraw(prices);
};

var numericAnswerMeaning = function(number){
  return function(question){
    return function(world){
      return world == number;
    };
  };
};

var meaning = function(utterance){
  return ((utterance === "yes") ? identity :
          (utterance === "no") ? negate :
          isNumeric(utterance) ? numericAnswerMeaning(utterance) :           
          (utterance === uniqueQuestion) ? uniqueQuestionMeaning :
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
      factor(literalListener(question, answer).score([], trueWorld));
      return answer;
    }
  );
});

var questioner = function(qud) {
  return Enumerate(function(){
    var question = questionPrior();

    // There's only a single question, so all of the following doesn't matter:
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
    factor(expectedKL);
    
    return question;
  });
};

var qudPrice = function(world){return world;};
var qudPriceGreaterThan5 = function(world){return world > 5;};

var qudPrior = function(context){
  if (context === buyWhiskeyContext){
    return (flip(0.5) ? qudPriceGreaterThan5 : qudPrice);
  } else if (context === spendFiveDollarsContext){
    return (flip(0.9) ? qudPriceGreaterThan5 : qudPrice);
  } else {
    console.error('unknown context');
  }
};

var pragmaticAnswerer = cache(function(context, question, trueWorld){
  // qud posterior is same as qud prior, since questioner has only a single question
  var qudPosterior = Enumerate(function(){
    var qud = qudPrior(context);
    var q_erp = questioner(qud);
    factor(q_erp.score([], question));
    return qud;
  });
  // need to restrict to truthful answers
  var truthfulAnswerPrior = Enumerate(function(){
    var answer = answerPrior();
    factor(literalListener(question, answer).score([], trueWorld));
    return answer;
  });
  return Enumerate(function(){
    var qud = sample(qudPosterior);
    // Pick answer conditioned on communicating question predicate value
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        return (qud(trueWorld) == qud(inferredWorld)) ? 1 : 0;
      });
    factor(Math.log(score));
    return answer;
  });
});


console.log(buyWhiskeyContext, uniqueQuestion);
qa.printERP(pragmaticAnswerer(buyWhiskeyContext, uniqueQuestion, 4));

console.log(spendFiveDollarsContext, uniqueQuestion);
qa.printERP(pragmaticAnswerer(spendFiveDollarsContext, uniqueQuestion, 4));

// I'd like to buy some whiskey. Does Jim Beam cost more than $5?
// { val: 4, prob: 0.4999999999999999 }
// { val: 'yes', prob: 0.5000000000000002 }

// I only have $5 to spend. Does Jim Beam cost more than $5?
// { val: 4, prob: 0.1666666666666666 }
// { val: 'yes', prob: 0.8333333333333334 }
