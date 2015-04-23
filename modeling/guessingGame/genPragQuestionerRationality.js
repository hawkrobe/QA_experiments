// Run as:
// webppl guessGameConditioning.js --require ./qa

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


// World knowledge

var taxonomy = {
  animal: {
    pet: {
       dalmatian: null,
       siamese: null
      //   poodle: null,
      //   dalmatian: null,
//        lab: null,
//      },
    },
    cat: {
        siamese: null, // no super category allowed
        lion: null
      },
    whale: null // no good category for this thing
//    },
  }
};

// All possible assignments of four objects to four positions
var worldSpace = map(
  function(perm) {
    return _.object(qa.leaves(taxonomy), perm);
  },
  qa.permute([1,2,3,4]));

var worldPrior = function() {
  return uniformDraw(worldSpace);
};


// Questions

// returns a function that maps world to the gate we should pick to find
// a leaf under the given node
var makeQUD = function(node){
  var subtree = qa.findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : qa.leaves(subtree);
  return function(world){
    return map(function(node) {return world[node];}, leavesBelowNode);
  };
};

var qudSpace = ['dalmatian', 'whale', 'lion', 'siamese'];

var qudNodePrior = function() {
  return uniformDraw(qudSpace)
};

var questionSpace = ['whereIsPet?', 'whereIsCat?', 'whereIsLion?', 'whereIsAnimal?'];

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  var testableX = (last(x) === '?') ? x.split("Is")[1].toLowerCase() : x;
  return (last(testableX) === '?') & (qa.isNodeInTree(qa.butLast(testableX), taxonomy));
};

var questionToNode = function(utterance){
  var temp = qa.butLast(utterance).split("Is");
  var node = temp[1].toLowerCase();
  return node;
};

var taxonomyQuestionMeaning = cache(function(utterance){
  var node = questionToNode(utterance);
  var subtree = qa.findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : qa.leaves(subtree);
  return function(world){
    return map(function(node) {return world[node];}, leavesBelowNode);
  };
});

// Answers

// Can tell questioner about a location of one object
var fullAnswerSpace = qa.flatten(map(function(leaf){
  map(function(loc){
    return leaf + '@' + loc + ".";
  }, [1,2,3,4]);
  }, qa.leaves(taxonomy)));

var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isTaxonomyAnswer = function(x){
  return (last(x) === '.') & (qa.isNodeInTree(qa.butLast(x).split("@")[0], taxonomy));
};

var taxonomyAnswerMeaning = cache(function(utterance){
  var temp = utterance.split("@");
  var node = temp[0];
  var location = qa.butLast(temp[1]);
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

// Captures the notion that some labels are better than others for a given object
// we'll eventually want to let these weights be free variables
var fitness = function(label, obj) {
  if(label == "cat") {
    if (obj == "siamese") {
      return 1
    } else if (obj == "lion") {
      return -1
    }
  } else {
    return 0;
  }
}

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
  function(question, trueWorld, rationality) {
    // Pick answer conditioned on communicating question predicate value
    return Enumerate(
      function(){
        var answer = fullAnswerPrior();
        factor(literalListener(question, answer).score([], trueWorld) * rationality);
        return answer;
      });
  });


var explicitAnswerer = cache(
  function(question, trueWorld, rationality) {
    // Pick answer conditioned on communicating question predicate value
    return Enumerate(
      function(){
        var truthfulAnswerPrior = Enumerate(function(){
          var answer = fullAnswerPrior();
          factor(literalListener(question, answer).score([], trueWorld));
          return answer
        })
        var answer = sample(truthfulAnswerPrior);
        var score = mean(
          function(){
            // We may be uncertain about which leaf node the question
            // refers to, so we're integrating over possible leaf nodes
            // of interest
            var questionNode = questionToNode(question);
            var subtree = qa.findSubtree(questionNode, taxonomy);
            var leavesBelowNode = subtree === null ? [questionNode] : qa.leaves(subtree);
            var leafOfInterest = uniformDraw(leavesBelowNode);
            factor(fitness(questionNode, leafOfInterest))
            // Did the listener infer the correct location of the leaf
            // node of interest?
            var inferredWorld = sample(literalListener(question, answer));
            var inferredPosition = inferredWorld[leafOfInterest];
            var truePosition = trueWorld[leafOfInterest];
            return (truePosition == inferredPosition) ? 1 : 0;
          });
        factor(Math.log(score) * rationality);
        return answer;
      });
  });


var explicitQuestioner = cache(function(qud_node, rationality) {
  var qud = (makeQUD(qud_node))
  
  Enumerate(function(){
//    console.log("evaluating question for qud " + qud_node)
    var question = questionPrior();
//    console.log(question)
    // What is the gate value I'd guess under my prior?
    var prior = Enumerate(function(){
      return qud(worldPrior());
    });
    var expectedKL = mean(
      function(){
        // What do I expect the world to be like?
        var trueWorld = worldPrior();
        // If I ask this question, what answer do I expect to get,
        // given what the world is like?
        var answer = sample(explicitAnswerer(question, trueWorld, rationality));
        var posterior = Enumerate(function(){
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under
          // this new distribution on worlds?
          return qud(world);
        });
        return qa.KL(posterior, prior);
      });
    factor(expectedKL * rationality);
    return question;
  });
});

var pragmaticAnswerer = cache(function(question, trueWorld, rationality){
  var qudNodePosterior = Enumerate(function(){
    var qudNode = qudNodePrior();
    var q_erp = explicitQuestioner(qudNode, rationality);
    factor(q_erp.score([], question));
    return qudNode;
  });
  return Enumerate(function(){
    var qud = makeQUD(sample(qudNodePosterior));
    // Pick answer conditioned on communicating question predicate value
    var truthfulAnswerPrior = Enumerate(function(){
      var answer = fullAnswerPrior();
      factor(literalListener(question, answer).score([], trueWorld));
      return answer
    })
    var answer = sample(truthfulAnswerPrior)
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        var inferredPosition = qud(inferredWorld);
        var truePosition = qud(trueWorld)
        return (truePosition[0] == inferredPosition[0]) ? 1 : 0;
      });
    factor(Math.log(score) * rationality);
    return answer;
  });
})

var pragmaticQuestioner = cache(function(qud_node, rationality) {
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
        // If I ask this question, what answer do I expect to get,
        // given what the world is like?
        var answer = sample(pragmaticAnswerer(question, trueWorld, rationality));
        var posterior = Enumerate(function(){
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under
          // this new distribution on worlds?
          return qud(world);
        });
        return qa.KL(posterior, prior);
      });
    factor(expectedKL * rationality);
    return question;
  });
});

var main = function(){
  var world = {poodle: 1, dalmatian: 2, siamese: 3, whale: 4};
  var questions = questionSpace
  var qudNodes = qudSpace

  var rationalityPs = [2,4]

  var f_ans = function(question,rationality){
    qa.printERP(literalAnswerer(question, world,rationality));
  };
  var f_q = function(qudNode,rationality) {
    qa.printERP(explicitQuestioner(qudNode,rationality))
  };
  var f_prag_ans = function(question,rationality){
    qa.printERP(pragmaticAnswerer(question, world,rationality));
  };
  var f_prag_q = function(qudNode, rationality) {
    qa.printERP(pragmaticQuestioner(qudNode,rationality))
  };

  map(function(rationality) {
    map(function(qudNode) {
      var label = [qudNode, rationality]
      console.log(label)
      console.log("reg q")
      f_q(qudNode, rationality)
      console.log("prag q")
      f_prag_q(qudNode, rationality)
    }, qudNodes)
  }, rationalityPs)

  return 'done';
};

main();
