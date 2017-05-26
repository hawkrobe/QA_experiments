///fold:
var KL = function(erpTrue, erpApprox){
  var values = erpTrue.support([]);
  return sum(map(
    function(value){
      var scoreP = erpTrue.score(value);
      var scoreQ = erpApprox.score(value);
      var probP = Math.exp(scoreP);
      return probP == 0.0 ? 0.0 : probP * (scoreP - scoreQ);
    }, values));
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

var getFilteredCardList = function(world) {
  var cardList = map(function(value) {
    var hasCard = world[value];
    if(hasCard) {
      return value;
    } else {
      return []
    }
  }, _.keys(world))

  var filteredCardList = filter(function(val){
    if(_.isEmpty(val))
      return false
    else
      return true
  }, cardList)

  return filteredCardList;
}

var allFalse = function(boolList) {
  return reduce(function(val, memo) {
    return !val && memo;
  }, true, boolList)
}

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

var toPairs = function(obj){
  return _.sortBy(_.toPairs(obj));
}

var toObject = function(pairs){
  return _.zipObject(pairs);
}

var makeObjectScorer = function(dist) {
  var newDist = Infer({method: 'enumerate'}, function(){
    return toPairs(sample(dist));
  });
  return function(value) {
    return newDist.score(toPairs(value));
  }
}

var checkExhaustive = function(answer, trueWorld) {
  var cardsAccepted = filter(function(key){
    return trueWorld[key];
  }, _.keys(trueWorld));
  return _.isEqual(answer, cardsAccepted);
};

// var cardLikelihoods = {
//   'Visa' : 0.72,
//   'MasterCard' : 0.71,
//   'AmericanExpress' : 0.5,
//   'Diners' : 0.12,
//   'CarteBlanche' : 0.10
// };

var cardLikelihoods = {
  'Visa' : 0.5,
  'MasterCard' : 0.5,
  'AmericanExpress' : 0.5,
  'Diners' : 0.5,
  'CarteBlanche' : 0.5
};

var cardSetLikelihood = function(cardSet) {
  var cardsNotInSet = _.difference(cardTypes, cardSet);
  var inSetScore = reduce(function(v, memo){
    return memo * cardLikelihoods[v];
  }, 1, cardSet);
  var outOfSetScore = reduce(function(v, memo) {
    return memo * (1 - cardLikelihoods[v]);
  }, 1, cardsNotInSet);
  return inSetScore * outOfSetScore;
};

var getCardFromQuestion = function(q) {
  return butLast(last(q.split(' ')))
}
///


// --------------------------------------------------------------------

//   ---------------
// | World knowledge |
//   ---------------

var cardTypes = ['Visa','MasterCard', 'AmericanExpress', 'Diners', 'CarteBlanche'];

var cardPowerSet = powerset(cardTypes);

// Reflect real probabilities of acceptance from Clark
var worldPrior = function(){
  return {
    'Visa' : flip(cardLikelihoods['Visa']),
    'MasterCard' : flip(cardLikelihoods['MasterCard']),
    'AmericanExpress' : flip(cardLikelihoods['AmericanExpress']),
    'Diners' : flip(cardLikelihoods['Diners']),
    'CarteBlanche' : flip(cardLikelihoods['CarteBlanche'])
  };
};

//  -------------------
// | Question knowledge |
//  -------------------

var cardQuestions = map(function(s) {return "Do you accept " + s + "?"}, cardTypes);
var cardQuestionMeaning = function(card) {
  return function(world) {return world[card];};
};

var creditCardsQuestion = "Do you accept credit cards?";
var creditCardsQuestionMeaning = function(world){
  return _.some(_.values(world));
};

var questions = cardQuestions.concat([creditCardsQuestion]);
var questionPrior = function(){return uniformDraw(questions);};

//  -----------------
// | Answer knowledge |
//  -----------------

var cardAnswerSpace = powerset(cardTypes);
var booleanAnswerSpace = ["yes", "no"];

// 'yes' 'no' or some combination of cards
var answerPrior = function(){
  return (flip(0.9) ?
          uniformDraw(booleanAnswerSpace) :
          uniformDraw(cardAnswerSpace));
};

var cardAnswerMeaning = function(cardList){
  return function(questionMeaning){
    return function(world){
      var _worldCards = _.pickBy(world);
      var worldCards = _.isEmpty(_worldCards) ? [] : _.keys(_worldCards);
      return _.isEqual(sort(cardList), sort(worldCards));
    };
  };
};

var booleanAnswerMeaning = function(bool){
  return function(questionMeaning){
    return function(world){return questionMeaning(world) == bool};
  };
};

var cardUtterance = function(utterance) {
  var filteredList = filter(function(x) {
    return _.isEqual(x, utterance);
  }, cardAnswerSpace);
  return !_.isEmpty(filteredList);
};

var booleanUtterance = function(utterance) {
  var filteredList = filter(function(x) {
    return _.isEqual(x, utterance);
  }, booleanAnswerSpace);
  return !_.isEmpty(filteredList);
};

//   -----------
// | Interpreter |
//   -----------

var meaning = function(utterance){
  return (utterance === "yes" ? booleanAnswerMeaning(true) :
          utterance === "no" ? booleanAnswerMeaning(false) :
          _.includes(cardAnswerSpace, utterance) ? cardAnswerMeaning(utterance) :
          _.includes(cardQuestions, utterance) ? cardQuestionMeaning(getCardFromQuestion(utterance)):
          utterance === creditCardsQuestion ? creditCardsQuestionMeaning :
          console.error('unknown utterance in meaning!', utterance));
};

var interpreter = dp.cache(function(question, answer){
  return Infer({method: 'enumerate', model: function(){
    var world = worldPrior();
    var answerMeaning = meaning(answer);
    var questionMeaning = meaning(question);    
    condition(answerMeaning(questionMeaning)(world));
    return world;
  }});
}); 

var makeTruthfulAnswerPrior = dp.cache(function(type, question, trueWorld) {
  var truthfulAnswerPrior = Infer({method: 'enumerate', model: function(){
    var answer = answerPrior();
    // Don't allow A_0 to say yes/no b/c they depend on question...
    condition(type === 'literal' ? cardUtterance(answer) : true);
    var interpScorer = makeObjectScorer(interpreter(question, answer));
    condition(_.isFinite(interpScorer(trueWorld)));
    return answer;
  }});
  return truthfulAnswerPrior;
});

//  ------
// | QUDs |
//  ------

var qudPrior = function(){
  var filteredPowerSet = filter(function(set){return !_.isEmpty(set)}, cardPowerSet);
  var cardSet = uniformDraw(filteredPowerSet);
  factor(cardSetLikelihood(cardSet));
  return "QUD" + cardSet;
};

var nameToQUD = function(qudName) {
  if(qudName === 'identity') {
    return function(world) {return world};
  } else {
    var cardList = qudName.slice(3).split(",");
    return function(world){
      return _.some(map(function(card){return world[card]}, cardList));
    };
  }
};

var QUDPosteriorFromInference = dp.cache(function(question){
  return Infer({method: 'enumerate'}, function() {
    var qudName = qudPrior();
    var q_erp = questioner('explicit', qudName);
    observe(q_erp, question);
    return qudName;
  });
});

var QUDPosteriorFromMeaning = dp.cache(function(question){
  var correspondingQUD = (_.includes(cardQuestions, question) ?
                          "QUD" + getCardFromQuestion(question) :
                          "QUD" + cardTypes.join(','));
  return Delta({v: correspondingQUD});
});

//  -------
// | Models |
//  -------

var getProjectedWorldPrior = dp.cache(function(qudName) {
  var qud = nameToQUD(qudName);
  return Infer({method: 'enumerate'}, function(){return qud(worldPrior())});
});

var rationality = 10000;

var questioner = dp.cache(function(type, qudName) {
  return Infer({method: 'enumerate'}, function() {
    var question = questionPrior();
    var possibleAnswer = Infer({method: 'enumerate'}, function(){
      var trueWorld = worldPrior();
      return sample(answerer(type, question, trueWorld));
    });

    var infGain = function(answer){
      var prior = getProjectedWorldPrior(qudName);
      var posterior = Infer({method: 'enumerate'}, function(){
        var world = worldPrior();
        observe(answerer(type, question, world), answer);
        return nameToQUD(qudName)(world);
      });
      return KL(posterior, prior);
    };
    factor(expectation(possibleAnswer, infGain) * rationality);
    return question;
  });
});

var answerer = dp.cache(function(type, question, trueWorld) {
  var truthfulAnswerPrior = makeTruthfulAnswerPrior(type, question, trueWorld);
  var qudPosterior = (type === 'pragmatic' ? QUDPosteriorFromInference(question) :
                      type === 'explicit' ? QUDPosteriorFromMeaning(question) :
                      type === 'literal' ? Delta({v: 'identity'}) :
                      console.error('type not recognized'));
  // if(type ==='pragmatic') {
  //   console.log(question);
  //   console.log(truthfulAnswerPrior);
  //   console.log(qudPosterior);
  // }
  return Infer({method: 'enumerate'}, function(){
    var qud = nameToQUD(sample(qudPosterior));
    var answer = sample(truthfulAnswerPrior);
    var utility = expectation(interpreter(question, answer), function(possibleWorld) {
      return _.isEqual(qud(possibleWorld), qud(trueWorld));
    });
    factor(Math.log(utility) * rationality);      
    return answer;
  });
});

var world = {
  'Visa' : true,
  'MasterCard' : false,
  'AmericanExpress' : false,
  'Diners' : true,
  'CarteBlanche' : false
};

// var context = 'credit cards';
var runModel = function(type, question) {
  return expectation(Infer({method: 'enumerate', model: function(){
    var trueWorld = worldPrior();
    var ans = answerer(type, question, trueWorld);
    var possibleAns = sample(ans);
    return _.isArray(possibleAns) ? 0 : Math.exp(ans.score(possibleAns));
  }}));
};

// var truthfulAnswerPrior = makeTruthfulAnswerPrior('explicit', last(questions), world);
// console.log(truthfulAnswerPrior);
// var question = last(questions);
// var qud = nameToQUD('QUDVisa,MasterCard,AmericanExpress,Diners,CarteBlanche');

// console.log(
//   Infer({method: 'enumerate'}, function() {
//     var answer = sample(truthfulAnswerPrior);
//     console.log(answer);
//     var dist = Infer({method: 'enumerate'}, function() {
//       var possibleWorld = sample(interpreter(question, answer));
//       return qud(possibleWorld);
//     })
//     console.log(dist);
//     return dist.score(qud(world));
//   })
// )

console.log(questions[1]);
console.log('A0:' + runModel('literal', questions[1]));
console.log('A1:' + runModel('explicit', questions[1]));
console.log('A2:' + runModel('pragmatic', questions[1]));

console.log(questions[2]);
console.log('A0:' + runModel('literal', questions[2]));
console.log('A1:' + runModel('explicit', questions[2]));
console.log('A2:' + runModel('pragmatic', questions[2]));

console.log(last(questions));
console.log('A0:' + runModel('literal', last(questions)));
console.log('A1:' + runModel('explicit', last(questions)));
console.log('A2:' + runModel('pragmatic', last(questions)));
// console.log(answerer('explicit', last(questions), world));
