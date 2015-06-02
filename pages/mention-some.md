---
layout: page
title: Mention-some Questions
status: current
---

We'll set up the mention-some problem below, using the same structure as our other models

~~~~
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

var pickAllNewspaperCafes = function(world) {
  var trueCafes = _.keys(_.pick(world, function(value, key, object) {
    return value[1];
  }))
  if(_.isEmpty(trueCafes))
    return 'none'
  else 
    return trueCafes
}

var pickClosestNewspaperCafe = function(world) {
  var validPicks = _.pick(world, function(value, key, object) {
    return value[1];
  })
  if(_.isEmpty(validPicks))
    return 'none'
  else {
    return [_.min(_.keys(validPicks), function(k) {
      return validPicks[k][0];
    })]
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

var mean = function(thunk){
  return expectation(Enumerate(thunk), function(v){return v;});
};

var negate = function(predicate){
  return function(x){
    return !predicate(x);
  };
};

var identity = function(x){
 return x;
};

var condition = function(x){
 factor(x ? 0 : -Infinity);
};
///

// World knowledge

var distances = [1,3]//[1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var cafes = ['cafe1', 'cafe2', 'cafe3', 'cafe4']
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
  var drawCafe = function(cafeList) {
    if(_.isEmpty(cafeList))
      return []
    else {
      var newCafe = [uniformDraw(cafeList)]
      return (flip(0.5) ? newCafe :
        newCafe.concat(drawCafe(_.without(cafeList, newCafe[0]))))
    }
  }
  return flip(0.1) ? ['none'] : sort(drawCafe(cafes), function(s1, s2) {return s1[4] < s2[4]})
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

var explicitAnswerer = cache(
  function(question, trueWorld, ansRationality) {
    // Pick answer conditioned on communicating question predicate value
    return Enumerate(
      function(){
        var answer = fullAnswerPrior();
        //var answer = sample(truthfulAnswerPrior);
        var score = mean(
          function(){
            // We may be uncertain about which leaf node the question
            // refers to, so we're integrating over possible leaf nodes
            // of interest
            var questionNode = questionToNode(question);
            var subtree = findSubtree(questionNode, taxonomy);
            var leavesBelowNode = subtree === null ? [questionNode] : leaves(subtree);
            var leafOfInterest = uniformDraw(leavesBelowNode);
            // Did the listener infer the correct location of the leaf
            // node of interest?
            var inferredWorld = sample(literalListener(question, answer));
            var inferredPosition = inferredWorld[leafOfInterest];
            var truePosition = trueWorld[leafOfInterest];
            return (truePosition == inferredPosition) ? 1 : 0;
          });
        factor((Math.log(score) * ansRationality)
        	- answerLength(answer) * .25);
        return answer;
      });
  });

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

world = {'cafe1' : [3, false],
         'cafe2' : [1, true],
         'cafe3' : [3, true],
         'cafe4' : [3, true]}

console.log("world", world);

console.log(businesspersonContext, newspaperQuestion);
print(pragmaticAnswerer(businesspersonContext, newspaperQuestion, world));

console.log(touristContext, newspaperQuestion);
print(pragmaticAnswerer(touristContext, newspaperQuestion, world));

~~~~
