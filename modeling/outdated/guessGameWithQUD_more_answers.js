///fold:
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

var arraysEqual = function(a1, a2) {
  a1.sort()
  a2.sort()
  return JSON.stringify(a1) == JSON.stringify(a2);
};

var printERP = function(erp) {
  map(
    function(v) {console.log({val: v, prob: Math.exp(erp.score([], v))});},
    erp.support());
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

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
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
    return [[]]
  else {
    var rest = powerset(set.slice(1))
    return map(function(element) {
              return first(set) + element
            }, rest).concat(rest)
  }
}

var permute = function (input) {
  var input = input.slice();
  var permArr = [];
  var usedChars = [];
  var doPerm = function() {
    if (input.length == 0) {
      permArr.push(usedChars.slice());
    }
    map(function(i) {
      var ch = input.splice(i, 1)[0];
      usedChars.push(ch);
      doPerm();
      usedChars.pop();
      input.splice(i, 0, ch);
    }, _.range(input.length));
  };
  doPerm();
  return permArr;
};

// recursively traverse object; return all keys
var nodes = function(obj){
  if (obj === null){
    return [];
  } else {
    var keys = _.keys(obj);
    var subkeys = flatten(map(nodes, _.values(obj)));
    return keys.concat(subkeys);
  }
};

var _leaves = function(key, obj){
  if (obj === null){
    return [key];
  } else {
    var pairs = _.pairs(obj);
    return flatten(
      map(
        function(pair){return _leaves(pair[0], pair[1]);},
        pairs));
  }
};

// recursively traverse object; return all keys that map to null
var leaves = function(obj){
  var pairs = _.pairs(obj);
  return flatten(
    map(
      function(pair){return _leaves(pair[0], pair[1]);},
      pairs));
  };

// recursively traverse object; return value of key
var findSubtree = function(key, obj){
  if (obj[key] !== undefined){
    return obj[key];
  } else {
    var xs = map(
      function(maybeObj){
        if (maybeObj === undefined){
          return undefined;
        } else if (maybeObj === null){
          return undefined;
        } else if (typeof maybeObj === 'object'){
          return findSubtree(key, maybeObj);
        } else {
          return undefined;
        }
      },
      _.values(obj));
    return find(function(x){return x !== undefined;}, xs);
  }
};

var isNodeInTree = function(node, tree){
  return findSubtree(node, tree) !== undefined;
};
///


// World knowledge

var taxonomy = {
  thing: {
    animal: {
      dog: {
        poodle: null,
        dalmatian: null
      },
      siamese: null // no super category allowed
    },
    computer: null,
    flower: null 
  }
};

// All possible assignments of four objects to four positions

var locations = _.range(1, leaves(taxonomy).length + 1)

var worldSpace = map(
  function(perm) {
    return _.object(leaves(taxonomy), perm);
  },
  permute(locations));

var worldPrior = function() {
  return uniformDraw(worldSpace);
};


// Questions

// returns a function that maps world to the gate we should pick to find
// a leaf under the given node
var makeQUD = function(node){
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(world){
    return map(function(node) {return world[node];}, leavesBelowNode);
  };
};

var qudNodePrior = function() {
  return uniformDraw(leaves(taxonomy));
};

//var questionSpace = ['null'].concat(['animal@1?', 'dog@1?', 'dalmatian@1?']);
var questionSpace = ['whereIsAnimal?', 'whereIsDog?', 'whereIsDalmatian?', 'whereIsThing?'];

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  var testableX = (last(x) === '?') ? x.split("Is")[1].toLowerCase() : x;
  return (last(testableX) === '?') & (isNodeInTree(butLast(testableX), taxonomy));
};

// in our case, the meaning of the question should be equivalent to the qud,
// a mapping from a world to set of values we're interested in...
var taxonomyQuestionMeaning = cache(function(utterance){
  var temp = butLast(utterance).split("Is");
  var node = temp[1].toLowerCase();
  return makeQUD(node)
});

// Answers

// Can tell questioner about a location of one object
var answerLocs = butLast(powerset(locations))

// want to allow every node and every set of gates... 
var fullAnswerSpace = flatten(map(function(node){
  var goodAnswers = []
  map(function(loc){
    // only allow for statements that can be possible in at least one world 
    // e.g. can't say a dalmatian is at gate 1 and 3
    var ls = leaves(findSubtree(node, taxonomy))
    // this condition is hard to read
    if((ls.length == 0 & loc.length == 1) | (loc.length <= ls.length)) {
      goodAnswers.push(node + '@' + loc + ".");
    }
  }, answerLocs);
  return goodAnswers
}, nodes(taxonomy)));

var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isTaxonomyAnswer = function(x){
  return (last(x) === '.') & (isNodeInTree(butLast(x).split("@")[0], taxonomy));
};

// takes a location and a set of nodes and returns true if ANY of them are there in the given world
var nodeAtLocation = function (location, nodes, world) {
  reduce(function(node, rest){
    return rest | (world[node] == location)
  }, false, nodes)
}

// with this big answer space, need to check whether an item of the type given 
// really exists at all the locations given. This will automatically take care of
// nonsense answers like "dalmatian at 3 and 4", which will be false in all possible worlds.
// for now, we won't allow answers like '3', by itself, so that answers are independent of questions.
var taxonomyAnswerMeaning = cache(function(utterance){
  var temp = utterance.split("@");
  var node = temp[0];
  var locations = butLast(temp[1]).split('');
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(pred){
    return function(world){
      return reduce(function(loc, rest){
        return rest & (nodeAtLocation(loc, leavesBelowNode, world))
      }, true, locations)
    };
  };
});

// Sentence meaning (questions and answers)
var meaning = cache(function(utterance){
  return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance) :
//          isPolarAnswer(utterance) ? polarAnswerMeaning(utterance) :
          isTaxonomyAnswer(utterance) ? taxonomyAnswerMeaning(utterance) :
          utterance === 'null' ? function(w){return true;} :
          undefined);
});


// For "x@n."-style answers, the question doesn't play any role.
var literalListener = cache(function(question, answer){
  Enumerate(function(){
    var world = worldPrior();
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
});

var literalAnswerer = cache(function(question, trueWorld) {
  Enumerate(function(){
    // 1. Restrict to truthful answers
    var truthfulAnswerPrior = Enumerate(
      function(){
        var answer = fullAnswerPrior();
        factor(literalListener(question, answer).score([], trueWorld));
        return answer;
      });
    // 2. Pick answer conditioned on communicating question predicate value
    var answer = sample(truthfulAnswerPrior);
    var questionMeaning = meaning(question);
    var possibleWorld = sample(literalListener(question,answer))
    condition(
      arraysEqual(
        questionMeaning(possibleWorld),
        questionMeaning(trueWorld)));
    return answer;
  });
});

// console.log("for question whereIsDalmatian?, literalAnswerer says")
// printERP(literalAnswerer('whereIsDalmatian?', {poodle: 1, dalmatian: 3, siamese: 2, computer: 5, flower: 4, }))
// console.log("for question whereIsDog?, literalAnswerer says")
// printERP(literalAnswerer('whereIsDog?', {poodle: 1, dalmatian: 3, siamese: 2, computer: 5, flower: 4, }))
// console.log("for question whereIsAnimal?, literalAnswerer says")
// printERP(literalAnswerer('whereIsAnimal?', {poodle: 1, dalmatian: 3, siamese: 2, computer: 5, flower: 4, }))
// console.log("for question whereIsThing?, literalAnswerer says")
// printERP(literalAnswerer('whereIsThing?', {poodle: 1, dalmatian: 3, siamese: 2, computer: 5, flower: 4, }))

var questioner = cache(function(qud_node) {
  var qud = (makeQUD(qud_node))

  Enumerate(function(){
    var question = questionPrior();
    // What is the gate value I'd guess under my prior?
    var prior = Enumerate(function(){
      return qud(worldPrior());
    });
    var expectedKL = mean(
      function(){
        // What do I expect the world to be like?
        var trueWorld = worldPrior();
        var posterior = Enumerate(function(){
          // If I ask this question, what answer do I expect to get, given what the world is like?
          var answer = sample(literalAnswerer(question, trueWorld));
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under this new distribution on worlds?
          return qud(world);
        });
        return KL(posterior, prior);
      });
    factor(expectedKL);
    return question;
  });
});

 console.log("for QUD = dalmatian")
 printERP(questioner("dalmatian"))
// console.log("for QUD = poodle")
// printERP(questioner("poodle"))
// console.log("for QUD = siamese")
// printERP(questioner("siamese"))
// console.log("for QUD = flower")
// printERP(questioner("flower"))

var pragmaticAnswerer = cache(function(question, trueWorld){  
  var qudNodePosterior = Enumerate(function(){
    var qudNode = qudNodePrior();
    var q_erp = questioner(qudNode);
    factor(q_erp.score([], question) * 100);
    return qudNode;
  });
  // console.log("for question " + question)
  // printERP(qudNodePosterior)
  return Enumerate(function(){
    var qud = makeQUD(sample(qudNodePosterior));
    var truthfulAnswerPrior = Enumerate(
      function(){
        var answer = fullAnswerPrior();
        factor(literalListener(question, answer).score([], trueWorld));
        return answer;
      });
    var answer = sample(truthfulAnswerPrior)
    condition(
      arraysEqual(
        qud(sample(literalListener(question, answer))),
        qud(trueWorld)));
    return answer;
  });  
})

// console.log("prag responses for dalmation q")
// printERP(pragmaticAnswerer('whereIsDalmatian?', {poodle: 1, dalmatian: 2, siamese: 3, flower: 4}))
// console.log("prag responses for dog q")
// printERP(pragmaticAnswerer('whereIsDog?', {poodle: 1, dalmatian: 2, siamese: 3, flower: 4}))
// console.log("prag responses for animal q")
// printERP(pragmaticAnswerer('whereIsAnimal?', {poodle: 1, dalmatian: 2, siamese: 3, flower: 4}))
// console.log("prag responses for thing q")
// printERP(pragmaticAnswerer('whereIsThing?', {poodle: 1, dalmatian: 2, siamese: 3, flower: 4}))

var pragQuestioner = function(qud_node) {
  var qud = (makeQUD(qud_node))
  Enumerate(function(){
    var question = questionPrior();
    // What is the gate value I'd guess under my prior?
    var prior = Enumerate(function(){
      return qud(worldPrior());
    });
    var expectedKL = mean(
      function(){
        // What do I expect the world to be like?
        var trueWorld = worldPrior();
        var posterior = Enumerate(function(){
          // If I ask this question, what answer do I expect to get, given what the world is like?
          var answer = sample(pragmaticAnswerer(question, trueWorld));
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under this new distribution on worlds?
          return qud(world);
        });
        return KL(posterior, prior);
      });
    factor(expectedKL);
    return question;
  });
};

// console.log("prag question for QUD = dalmatian")
//  printERP(pragQuestioner("dalmatian"))
// console.log("prag question for QUD = poodle")
// printERP(pragQuestioner("poodle"))
// console.log("prag question for QUD = siamese")
// printERP(pragQuestioner("siamese"))
// console.log("prag question for QUD = flower")
// printERP(pragQuestioner("flower"))
