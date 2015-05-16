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
  };
};

// Returns whether or not the given cafe has a newspapers
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
    };
  };

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

world = {'cafe1' : [3, false],
         'cafe2' : [1, true],
         'cafe3' : [3, true],
         'cafe4' : [3, true]}

console.log("world", world);

console.log(businesspersonContext, newspaperQuestion);
qa.printERP(pragmaticAnswerer(businesspersonContext, newspaperQuestion, world));

console.log(touristContext, newspaperQuestion);
qa.printERP(pragmaticAnswerer(touristContext, newspaperQuestion, world));

