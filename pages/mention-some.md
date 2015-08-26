---
layout: page
title: Groenendijk and Stokhof (1984) -- mention-some vs. mention-all
status: current
---

We'll set up the mention-some problem below, using the same structure as our other models

~~~~
///fold:
var condition = function(x){
  var score = x ? 0 : -Infinity;
  factor(score);
};

var mean = function(thunk){
  return expectation(Enumerate(thunk), function(v){return v;});
};

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

var getFilteredCafeList = function(world) {
  var cafeList = map(function(value) {
    var hasNewspaper = world[value][1];
    if(hasNewspaper) {
      return value;
    } else {
      return []
    }
  }, _.keys(world))

  var filteredCafeList = filter(function(val){
    if(_.isEmpty(val))
      return false
    else
      return true
  }, cafeList)

  return filteredCafeList;
}

var pickAllNewspaperCafes = function(world) {
  var filt = getFilteredCafeList(world)
  if(_.isEmpty(filt))
    return 'none'
  else
    return filt
}

var pickClosestNewspaperCafe = function(world) {
  var filt = getFilteredCafeList(world);
  if(_.isEmpty(filt)) {
    return 'none'
  } else {
    return minWith(function(k) {
      return world[k][0];
    }, filt)[0]
  }
}                               

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

var all = function(p,l) { 
  return mapReduce1(function(a,b){ return a & b; }, p, l); };

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};
///

//   ---------------
// | World knowledge |
//   ---------------

var distances = [1,3]

var cafes = ['cafe1', 'cafe2', 'cafe3', 'cafe4']
var cafePowerset = powerset(cafes);

var touristContext = "I'm new in town.";
var businesspersonContext = "I'm trying to set up a newspaper distribution business.";

var isCafeList = function(x){
  return allTrue(map(function(v) {return _.contains(cafes, v)}, x));
};

var countCafeCombinations = function(n) {
  return filter(function(l) {return l.length == n}, cafePowerset).length;
};

var worldPrior = function(){
  return {
    'cafe1' : [uniformDraw(distances), flip(.5)],
    'cafe2' : [uniformDraw(distances), flip(.5)],
    'cafe3' : [uniformDraw(distances), flip(.5)],
    'cafe4' : [uniformDraw(distances), flip(.5)]
  }
}

var hasNewspaper = function(world, cafe) {
  if(_.contains(_.keys(world), cafe))
    return world[cafe][1]
  else
    return false
}

// Returns the distance of a cafe
var distance = function(world, cafe) {
  return world[cafe][0]
}

//  -------------------
// | Question knowledge |
//  -------------------

var newspaperQuestion = "Where can one buy an Italian newspaper?";

// projects from a world to the relevant properties for the desired answer
var newspaperQuestionMeaning = function(world){
  return _.object(map(function(cafe){
    return [cafe, hasNewspaper(world, cafe)]
  }, cafes))
};

var questions = [newspaperQuestion]

var questionPrior = function(){
  return uniformDraw(questions);
};

//  -----------------
// | Answer knowledge |
//  -----------------

// (truncated) geometric distribution
var answerPrior = function(){
  var tempAnswer = uniformDraw(cafePowerset)
  var score = (Math.pow(.5, tempAnswer.length + 1)
               / countCafeCombinations(tempAnswer.length))
  factor(Math.log(score))
  return (tempAnswer.length == 0 ? ['none'] : tempAnswer)
};

var cafeAnswerMeaning = function(cafeList){
  return function(world){
    var doTheyHaveNewspapers = map(function(cafe) {
      hasNewspaper(world, cafe)
    }, cafeList);
    return allTrue(doTheyHaveNewspapers);
  };
};

var noneMeaning = function() {
  return function(world){
    var doTheyHaveNewspapers = map(function(cafe) {
      hasNewspaper(world, cafe)
    }, cafes);
    return allFalse(doTheyHaveNewspapers);
  }
}

//   -----------
// | Interpreter |
//   -----------

var meaning = function(utterance){
  return (isCafeList(utterance) ? cafeAnswerMeaning(utterance) :
         (_.isEqual(utterance, [ "none" ])) ? noneMeaning() : 
         (utterance === newspaperQuestion) ? newspaperQuestionMeaning :
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

var makeTruthAnswerPrior = function(trueWorld) {
  var truthfulAnswerPrior = Enumerate(function(){
    var answer = answerPrior();
    factor(interpreter(answer).score([], trueWorld));
    return answer
  });
  return truthfulAnswerPrior;
};

//  ------
// | QUDs |
//  ------

var qudAll = function(world){return pickAllNewspaperCafes(world);};
var qudClosest = function(world){return pickClosestNewspaperCafe(world);};

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
          qudName == newspaperQuestion ? newspaperQuestionMeaning :
          console.error('unknown qud name', qudName));
};

//  -------
// | Models |
//  -------

var explicitAnswerer = cache(function(question, trueWorld, rationality) {
  var qud = nameToQUD(question);
  return Enumerate(function(){
    var truthfulAnswerPrior = makeTruthAnswerPrior(trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(function(){
      var inferredWorld = sample(interpreter(answer));
      return (qud(trueWorld) == qud(inferredWorld) ? 1 : 0);
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
    // Pick answer conditioned on communicating question predicate value
    var truthfulAnswerPrior = makeTruthAnswerPrior(trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(interpreter(answer));
        return (_.isEqual(qud(trueWorld), qud(inferredWorld))) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * rationality);
    return answer;
  });
};

var world = {'cafe1' : [3, false],
             'cafe2' : [1, true],
             'cafe3' : [3, true],
             'cafe4' : [3, true]}

print("world", world);

print(businesspersonContext, newspaperQuestion);
print(pragmaticAnswerer(businesspersonContext, newspaperQuestion, world,1));

print(touristContext, newspaperQuestion);
print(pragmaticAnswerer(touristContext, newspaperQuestion, world,1));

~~~~
