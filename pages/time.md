---
layout: page
title: Gibbs Jr. & Bryant (2008)
status: current
---

We'll set up the mention-some problem below, using the same structure as our other models

~~~~
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


var timeDiff = function(timeString1, timeString2) {
  var min1 = timeString1.split(":")[1]
  var min2 = timeString2.split(":")[1]
  return Math.abs(min2 - min1)
}

var getEveryFifthTime = function(list) {
  return filter(function(num) {
    return num[3] % 5 == 0;
  }, list);
};

var roundToNearest = function(time) {
  var hour = time.split(":")[0]
  var minutes = time.split(":")[1]
  var roundedMinutes = 5 * Math.round(minutes / 5)
  return hour + ":" + roundedMinutes
}

///

// --------------------------------------------------------------------


var currTimes = map(function(n) {return "3:" + n;}, _.range(30, 60));

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
      factor(literalListener(question, answer).score([], trueWorld));
      return answer;
    }
  );
});

var qudFactory = function(threshold) {
 return function(world){
  if(world < threshold) {
    return roundToNearest(world)
  } else {
    return world
  }
 }}

// Family of quds parameterized by threshold at which "running late"
// Thresholds closer to the appointment are more likely
var qudPrior = function(context){
  var threshold = uniformDraw(qa.getEveryFifthElement(currTimes))
  var appointmentTime = "4:00"
  factor(timeDiff(threshold, appointmentTime))
  return "qud" + threshold
};

var nameToQUD = function(qudName){
  var threshold = qudName.slice(3)
  return qudFactory(threshold)
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
    var answer = answerPrior();
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        return (_.isEqual(qud(trueWorld), qud(inferredWorld))) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * 10);
    return answer;
  });
};


//var qud = qudFactory("qud3:30")

var world = "3:34"
print(appointmentContext + " " + timeQuestion + "; " +  "true time = ", world);
var erp = pragmaticAnswerer(appointmentContext, timeQuestion, world)
print(erp)

var world = "3:54"
print(appointmentContext + " " + timeQuestion + "; " +  "true time = ", world);
var erp = pragmaticAnswerer(appointmentContext, timeQuestion, world)
print(erp);

