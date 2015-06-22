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

var setsEqual = function(a1, a2){
  var s1 = a1.slice().sort();
  var s2 = a2.slice().sort();
  return JSON.stringify(s1) === JSON.stringify(s2);
}

var powerset = function(set) {
  if (set.length == 0)
    return [[]];
  else {
    var rest = powerset(set.slice(1));
    return map(
      function(element) {
        return [set[0]].concat(element);
      },
      rest).concat(rest);
  }
}

var mapReduce1 = function(f,g,ar){
  // specialized to above reduce
  return reduce(function(a,b) { return f(g(a),b); }, g(ar[ar.length-1]), ar.slice(0,-1));
};

var all = function(p,l) { 
  return mapReduce1(function(a,b){ return a & b; }, p, l); };

var permute = function (input) {
  var input = input.slice();
  var permArr = [];
  var usedChars = [];
  var doPerm = function() {
    if (input.length == 0) {
      permArr.push(usedChars.slice());
    }
    map(
      function(i) {
        var ch = input.splice(i, 1)[0];
        usedChars.push(ch);
        doPerm();
        usedChars.pop();
        input.splice(i, 0, ch);
      },
      _.range(input.length));
  };
  doPerm();
  return permArr;
};


var cartesianProductOf = function(listOfLists) {
    return reduce(function(b, a) {
        return _.flatten(map(function(x) {
          console.log(x)
            return map(function(y) {
              console.log(y)
              return x.concat(y);
            }, b);
          }, a), true);
  }, [[]], listOfLists);
};

// Sometimes you just need all possible combination of true and false
var TFCartesianProd = function(n) {
  var inner_fun = function(n, result) {
    if (n == 0)
      return result
    else
      return inner_fun(n-1, result.concat([['true','false']]))
  }
  var result = inner_fun(n, [])
  console.log(result)
  return cartesianProductOf(result);
}

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};

///


// --------------------------------------------------------------------

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
  return price(world) <= 5;
};

var questions = [isMoreThanFiveQuestion];

var questionPrior = function(){
  return uniformDraw(questions);
};

var answerPrior = function(){
  // prefer yes/no over detailed answer
  return flip(0.6) ? uniformDraw(["yes", "no"]) : uniformDraw(prices);
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
      }
    }
  }
}

var meaning = function(utterance){
  return ((utterance === "yes") ? booleanAnswerMeaning(true) :
          (utterance === "no") ? booleanAnswerMeaning(false) :
          isNumeric(utterance) ? numericAnswerMeaning(utterance) :
          (utterance === isMoreThanFiveQuestion) ? isMoreThanFiveQuestionMeaning :
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

var qudPrior = function(context){
  var p = ((context === buyWhiskeyContext) ? 0.5 :
           (context === spendFiveDollarsContext) ? 0.9 :
           console.error('unknown context'));
  return (flip(p) ? "qudPriceGreaterThan5" :
          "qudPrice");
};

var nameToQUD = function(qudName){
  return (qudName == "qudPriceGreaterThan5" ? qudPriceGreaterThan5 :
    qudName == "qudPrice" ? qudPrice :
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
  return KL(posterior, prior);
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
    var truthfulAnswerPrior = Enumerate(function(){
      var answer = answerPrior();
      factor(literalListener(question, answer).score([], trueWorld));
      return answer
    })
    // Pick answer conditioned on communicating question predicate value
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        return (qud(trueWorld) == qud(inferredWorld)) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * 3);
    return answer;
  });
};

var world = [4];
console.log("world", world);

console.log(buyWhiskeyContext, isMoreThanFiveQuestion);
qa.printERP(pragmaticAnswerer(buyWhiskeyContext, isMoreThanFiveQuestion, world));

console.log(spendFiveDollarsContext, isMoreThanFiveQuestion);
qa.printERP(pragmaticAnswerer(spendFiveDollarsContext, isMoreThanFiveQuestion, world));

