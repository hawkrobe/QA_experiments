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

var countCafeCombinations = function(n) {
  return filter(function(l) {return l.length == n}, cafePowerset).length;
};

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

var cafePowerset = powerset(cafes);

var countCafeCombinations = function(n) {
  return filter(function(l) {return l.length == n}, cafePowerset).length;
};

var all = function(p,l) { 
  return mapReduce1(function(a,b){ return a & b; }, p, l); };

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};
///

// World knowledge

var distances = [1,3]//[1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var cafes = ['cafe1', 'cafe2', 'cafe3', 'cafe4']
var cafePowerset = powerset(cafes);

var touristContext = "I'm new in town.";
var businesspersonContext = "I'm trying to set up a newspaper distribution business.";

var isCafeList = function(x){
  return allTrue(map(function(v) {return _.contains(cafes, v)}, x));
};

var worldPrior = function(){
  return {
    'cafe1' : [uniformDraw(distances), flip(.5)],
    'cafe2' : [uniformDraw(distances), flip(.5)],
    'cafe3' : [uniformDraw(distances), flip(.5)],
    'cafe4' : [uniformDraw(distances), flip(.5)]
  }
}
// Questions

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
  
var newspaperQuestion = "Where can one buy an Italian newspaper?";

// projects from a world to the relevant properties for the desired answer
var newspaperQuestionMeaning = function(world){
  return _.object(map(function(cafe){
    return [cafe, hasNewspaper(world, cafe)]
  }, cafes))
};

var questions = [newspaperQuestion] //doYouTakeCreditQuestion];

var questionPrior = function(){
  return uniformDraw(questions);
};

// built-in cost for saying more than one answer
var answerPrior = function(){
  var tempAnswer = uniformDraw(cafePowerset)
  var score = (Math.pow(.5, tempAnswer.length + 1)
                   / countCafeCombinations(tempAnswer.length))
  factor(Math.log(score))
  return (tempAnswer.length == 0 ? ['none'] : tempAnswer)
};

var cafeAnswerMeaning = function(cafeList){
  return function(questionMeaning){
    return function(world){
      var doTheyHaveNewspapers = map(function(cafe) {
        hasNewspaper(world, cafe)
      }, cafeList);
      return allTrue(doTheyHaveNewspapers);
    };
  };
};

var noneMeaning = function() {
  return function(questionMeaning){
    return function(world){
      var doTheyHaveNewspapers = map(function(cafe) {
        hasNewspaper(world, cafe)
      }, cafes);
      return allFalse(doTheyHaveNewspapers);
    } 
  }
}

var meaning = function(utterance){
  return (isCafeList(utterance) ? cafeAnswerMeaning(utterance) :
         (_.isEqual(utterance, [ "none" ])) ? noneMeaning() : 
         (utterance === newspaperQuestion) ? newspaperQuestionMeaning :
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
      var ll = literalListener(question, answer)
      factor(literalListener(question, answer).score([], trueWorld) * 3);
      return answer;
    }
  );
});

var qudAll = function(world){return pickAllNewspaperCafes(world)}
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

var world = {'cafe1' : [3, false],
         'cafe2' : [1, true],
         'cafe3' : [3, true],
         'cafe4' : [3, true]}

print("world", world);

print(businesspersonContext, newspaperQuestion);
print(pragmaticAnswerer(businesspersonContext, newspaperQuestion, world));

print(touristContext, newspaperQuestion);
print(pragmaticAnswerer(touristContext, newspaperQuestion, world));

~~~~
