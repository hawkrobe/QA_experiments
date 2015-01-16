---
layout: page
title: Basic approach
status: current
---

Here's the big model: will break it down into smaller parts.

~~~~
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
        return set[0] + element;
      },
      rest).concat(rest);
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

var taxonomy = {
  thing: {
    animal: {
      dog: {
        poodle: null,
        dalmatian: null
      },
      siamese: null // no super category allowed
    },
    flower: null // no good category for this thing
  }
};

// Different gates items could be behind
var locations = _.range(1, leaves(taxonomy).length + 1)

// world space is all possible assignments of four objects to four positions
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
  return uniformDraw(['dalmatian', 'poodle', 'siamese', 'flower']);
};

var questionSpace = ['whereIsAnimal?', 'whereIsDog?', 'whereIsDalmatian?', 'whereIsThing?'];

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  var testableX = (last(x) === '?') ? x.split("Is")[1].toLowerCase() : x;
  return (last(testableX) === '?') & (isNodeInTree(butLast(testableX), taxonomy));
};

var questionToNode = function(utterance){
  var temp = butLast(utterance).split("Is");
  var node = temp[1].toLowerCase();
  return node;
};

var taxonomyQuestionMeaning = cache(function(utterance){
  var node = questionToNode(utterance);
  return makeQUD(node)
});

// Answers

// Can tell questioner about a location of one object
var fullAnswerSpace = flatten(map(function(leaf){
  map(function(loc){
    return leaf + '@' + loc + ".";
  }, locations);
  }, leaves(taxonomy)));

var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isTaxonomyAnswer = function(x){
  return (last(x) === '.') & (isNodeInTree(butLast(x).split("@")[0], taxonomy));
};

var taxonomyAnswerMeaning = cache(function(utterance){
  var temp = utterance.split("@");
  var node = temp[0];
  var location = butLast(temp[1]);
  return function(pred){
    return function(x){
      return x[node] == location; // return true if the object really is in this location
    };
  };
});

// Sentence meaning (questions and answers)

var meaning = cache(function(utterance){
  return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance) :
          isTaxonomyAnswer(utterance) ? taxonomyAnswerMeaning(utterance) :
          utterance === 'null' ? function(w){return true;} :
          undefined);
});

// Agents

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


var literalAnswerer = cache(
  function(question, trueWorld) {
    return Enumerate(
      function(){
        var answer = fullAnswerPrior();
        // 1. Restrict to truthful answers. May not be necessary.
        factor(literalListener(question, answer).score([], trueWorld));
        // 2. Score answer based on expected probability of communicating question predicate value
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
        factor(Math.log(score));
        return answer;
      });
  });

var main = function(){
  var world = {poodle: 1, dalmatian: 2, siamese: 3, flower: 4};
  var questions = ['whereIsDalmatian?', 'whereIsDog?', 'whereIsAnimal?', 'whereIsThing?'];
  var qudNodes = ['dalmatian', 'poodle', 'siamese', 'flower']
  var f_ans = function(question){
    print(question);
    print(literalAnswerer(question, world));
  };
  map(f_ans, questions)
  return 'done';
};

main();

~~~~

Next, use questioner

~~~~
///fold:
var taxonomy = {
  thing: {
    animal: {
      dog: {
        poodle: null,
        dalmatian: null
      },
      siamese: null // no super category allowed
    },
    flower: null // no good category for this thing
  }
};

// Different gates items could be behind
var locations = _.range(1, leaves(taxonomy).length + 1)

// world space is all possible assignments of four objects to four positions
var worldSpace = map(
  function(perm) {
    return _.object(leaves(taxonomy), perm);
  },
  permute(locations));

var worldPrior = function() {
  return uniformDraw(worldSpace);
};
var makeQUD = function(node){
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(world){
    return map(function(node) {return world[node];}, leavesBelowNode);
  };
};
var qudNodePrior = function() {
  return uniformDraw(['dalmatian', 'poodle', 'siamese', 'flower']);
};

var questionSpace = ['whereIsAnimal?', 'whereIsDog?', 'whereIsDalmatian?', 'whereIsThing?'];

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  var testableX = (last(x) === '?') ? x.split("Is")[1].toLowerCase() : x;
  return (last(testableX) === '?') & (isNodeInTree(butLast(testableX), taxonomy));
};

var questionToNode = function(utterance){
  var temp = butLast(utterance).split("Is");
  var node = temp[1].toLowerCase();
  return node;
};

var taxonomyQuestionMeaning = cache(function(utterance){
  var node = questionToNode(utterance);
  return makeQUD(node)
});

// Answers

// Can tell questioner about a location of one object
var fullAnswerSpace = flatten(map(function(leaf){
  map(function(loc){
    return leaf + '@' + loc + ".";
  }, locations);
  }, leaves(taxonomy)));

var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isTaxonomyAnswer = function(x){
  return (last(x) === '.') & (isNodeInTree(butLast(x).split("@")[0], taxonomy));
};

var taxonomyAnswerMeaning = cache(function(utterance){
  var temp = utterance.split("@");
  var node = temp[0];
  var location = butLast(temp[1]);
  return function(pred){
    return function(x){
      return x[node] == location; // return true if the object really is in this location
    };
  };
});

// Sentence meaning (questions and answers)

var meaning = cache(function(utterance){
  return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance) :
          isTaxonomyAnswer(utterance) ? taxonomyAnswerMeaning(utterance) :
          utterance === 'null' ? function(w){return true;} :
          undefined);
});

// Agents

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


var literalAnswerer = cache(
  function(question, trueWorld) {
    return Enumerate(
      function(){
        var answer = fullAnswerPrior();
        // 1. Restrict to truthful answers. May not be necessary.
        factor(literalListener(question, answer).score([], trueWorld));
        // 2. Score answer based on expected probability of communicating question predicate value
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
        factor(Math.log(score));
        return answer;
      });
  });

///
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
          // If I ask this question, what answer do I expect to get,
          // given what the world is like?
          var answer = sample(literalAnswerer(question, trueWorld));
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under
          // this new distribution on worlds?
          return qud(world);
        });
        return KL(posterior, prior);
      });
    factor(expectedKL);
    return question;
  });
});

var main = function(){
  var world = {poodle: 1, dalmatian: 2, siamese: 3, flower: 4};
  var questions = ['whereIsDalmatian?', 'whereIsDog?', 'whereIsAnimal?', 'whereIsThing?'];
  var qudNodes = ['dalmatian', 'poodle', 'siamese', 'flower']
  var f_q = function(qudNode) {
    print(qudNode);
    print(questioner(qudNode))
  };
  map(f_q, qudNodes)
  return 'done';
};

main();

~~~~

Now, pragmatic answerer:

~~~~
///fold:
var taxonomy = {
  thing: {
    animal: {
      dog: {
        poodle: null,
        dalmatian: null
      },
      siamese: null // no super category allowed
    },
    flower: null // no good category for this thing
  }
};

// Different gates items could be behind
var locations = _.range(1, leaves(taxonomy).length + 1)

// world space is all possible assignments of four objects to four positions
var worldSpace = map(
  function(perm) {
    return _.object(leaves(taxonomy), perm);
  },
  permute(locations));

var worldPrior = function() {
  return uniformDraw(worldSpace);
};
var makeQUD = function(node){
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(world){
    return map(function(node) {return world[node];}, leavesBelowNode);
  };
};
var qudNodePrior = function() {
  return uniformDraw(['dalmatian', 'poodle', 'siamese', 'flower']);
};

var questionSpace = ['whereIsAnimal?', 'whereIsDog?', 'whereIsDalmatian?', 'whereIsThing?'];

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  var testableX = (last(x) === '?') ? x.split("Is")[1].toLowerCase() : x;
  return (last(testableX) === '?') & (isNodeInTree(butLast(testableX), taxonomy));
};

var questionToNode = function(utterance){
  var temp = butLast(utterance).split("Is");
  var node = temp[1].toLowerCase();
  return node;
};

var taxonomyQuestionMeaning = cache(function(utterance){
  var node = questionToNode(utterance);
  return makeQUD(node)
});

// Answers

// Can tell questioner about a location of one object
var fullAnswerSpace = flatten(map(function(leaf){
  map(function(loc){
    return leaf + '@' + loc + ".";
  }, locations);
  }, leaves(taxonomy)));

var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isTaxonomyAnswer = function(x){
  return (last(x) === '.') & (isNodeInTree(butLast(x).split("@")[0], taxonomy));
};

var taxonomyAnswerMeaning = cache(function(utterance){
  var temp = utterance.split("@");
  var node = temp[0];
  var location = butLast(temp[1]);
  return function(pred){
    return function(x){
      return x[node] == location; // return true if the object really is in this location
    };
  };
});

// Sentence meaning (questions and answers)

var meaning = cache(function(utterance){
  return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance) :
          isTaxonomyAnswer(utterance) ? taxonomyAnswerMeaning(utterance) :
          utterance === 'null' ? function(w){return true;} :
          undefined);
});

// Agents

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


var literalAnswerer = cache(
  function(question, trueWorld) {
    return Enumerate(
      function(){
        var answer = fullAnswerPrior();
        // 1. Restrict to truthful answers. May not be necessary.
        factor(literalListener(question, answer).score([], trueWorld));
        // 2. Score answer based on expected probability of communicating question predicate value
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
        factor(Math.log(score));
        return answer;
      });
  });
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
          // If I ask this question, what answer do I expect to get,
          // given what the world is like?
          var answer = sample(literalAnswerer(question, trueWorld));
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under
          // this new distribution on worlds?
          return qud(world);
        });
        return KL(posterior, prior);
      });
    factor(expectedKL);
    return question;
  });
});
///
var pragmaticAnswerer = cache(function(question, trueWorld){
  var qudNodePosterior = Enumerate(function(){
    var qudNode = qudNodePrior();
    var q_erp = questioner(qudNode);
    factor(q_erp.score([], question));
    return qudNode;
  });
  return Enumerate(function(){
    var qud = makeQUD(sample(qudNodePosterior));
    // Pick answer conditioned on communicating question predicate value
    var answer = fullAnswerPrior()
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        var inferredPosition = qud(inferredWorld);
        var truePosition = qud(trueWorld)
        return (truePosition[0] == inferredPosition[0]) ? 1 : 0;
      });
    factor(Math.log(score));
    return answer;
  });
})

var main = function(){
  var world = {poodle: 1, dalmatian: 2, siamese: 3, flower: 4};
  var questions = ['whereIsDalmatian?', 'whereIsDog?', 'whereIsAnimal?', 'whereIsThing?'];
  var qudNodes = ['dalmatian', 'poodle', 'siamese', 'flower']
  var f_prag_ans = function(question){
    print(question);
    print(pragmaticAnswerer(question, world));
  };
  map(f_prag_ans, questions)
  return 'done';
};

main();

~~~~