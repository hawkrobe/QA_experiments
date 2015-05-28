// Run as:
// webppl guessGameConditioning.js --require ./qa

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};

var mean = function(thunk){
  return expectation(Enumerate(thunk, 100), function(v){return v;});
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
var condition1 = {
  taxonomy : {
    animal: {
      pet: {
        dog : {
         dalmatian: null,
         poodle: null
       },
       siamese : null
     },
    whale: null // no good category for this thing
    },
  },
  qudSpace : ['dalmatian', 'poodle', 'siamese', 'whale'],
  labelSpace : ['dalmatian', 'dog', 'pet', 'animal'],
  exampleWorld: {dalmatian: 2, poodle: 1, siamese: 3, whale: 4}
};

var condition2 = {
  taxonomy : {
    animal: {
      pet: {
        dalmatian: null,
        siamese : null
      },
      cat: {
        lion : null,
        siamese : null
      },
      whale: null // no good category for this thing
    },
  },
  qudSpace : ['dalmatian', 'whale', 'lion', 'siamese'],
  labelSpace : ['pet', 'cat', 'lion', 'animal'],
  exampleWorld: {dalmatian: 2, siamese: 1, lion: 3, whale: 4}

}

var condition3 = {
  taxonomy : {
    animal: {
      fish : {
        beta : null,
        goldfish: null,
        angler : null
      },
      pet : {
        dalmatian : null,
        goldfish: null,
        beta : null
      }
    },
  },
  qudSpace : ['beta', 'goldfish', 'angler', 'dalmatian'],
  labelSpace : ['fish', 'pet'],
  exampleWorld: {beta: 1, goldfish: 2, angler: 3, dalmatian: 4}
}

var QAmodel = function(conditionObj) {
  taxonomy = conditionObj.taxonomy;
  qudSpace = conditionObj.qudSpace;
  labelSpace = conditionObj.labelSpace;
  exampleWorld = conditionObj.exampleWorld;

  // set up world space: All possible assignments of four objects to four positions
  worldSpace = map(
    function(perm) {
      return _.object(qa.leaves(taxonomy), perm);
    },
    qa.permute([1,2,3,4]));

  questionSpace = map(
    function(v)  {return 'whereIs' + v.charAt(0).toUpperCase() + v.slice(1) + '?'}, 
    labelSpace);

  // Can tell questioner about a location of one object
  fullAnswerSpace = qa.flatten(map(function(leaf){
    map(function(loc){
      return leaf + '@' + loc + ".";
    }, [1,2,3,4]);
  }, qa.leaves(taxonomy)));

  var worldPrior = function() {
    return uniformDraw(worldSpace);
  };

  // returns a function that maps world to the gate we should pick to find
  // a leaf under the given node
  var makeQUD = function(node){
    var subtree = qa.findSubtree(node, taxonomy);
    var leavesBelowNode = subtree === null ? [node] : qa.leaves(subtree);
    return function(world){
      return map(function(node) {return world[node];}, leavesBelowNode);
    };
  };

  // These are the objects the questioner might be interested in
  var qudNodePrior = function() {
    return uniformDraw(qudSpace)
  };

  var questionPrior = function() {
    return uniformDraw(questionSpace);
  };

  var questionToNode = function(utterance){
    var temp = qa.butLast(utterance).split("Is");
    var node = temp[1].toLowerCase();
    return node;
  };

  var fullAnswerPrior = function(){
    return uniformDraw(fullAnswerSpace);
  };

  var isTaxonomyQuestion = function(x){
    var testableX = (last(x) === '?') ? x.split("Is")[1].toLowerCase() : x;
    return (last(testableX) === '?') & (qa.isNodeInTree(qa.butLast(testableX), taxonomy));
  };

  var taxonomyQuestionMeaning = cache(function(utterance){
    var node = questionToNode(utterance);
    var subtree = qa.findSubtree(node, taxonomy);
    var leavesBelowNode = subtree === null ? [node] : qa.leaves(subtree);
    return function(world){
      return map(function(node) {return world[node];}, leavesBelowNode);
    };
  });

  var isTaxonomyAnswer = function(x){
    return (last(x) === '.') & (qa.isNodeInTree(qa.butLast(x).split("@")[0], taxonomy));
  };

  var taxonomyAnswerMeaning = cache(function(utterance){
    var temp = utterance.split("@");
    var node = temp[0];
    var location = qa.butLast(temp[1]);
    return function(pred){
      return function(x){
      return x[node] == location; // return true if the object really is in location
    };
  };
  });

  var meaning = cache(function(utterance){
    return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance) :
      isTaxonomyAnswer(utterance) ? taxonomyAnswerMeaning(utterance) :
      utterance === 'null' ? function(w){return true;} :
      undefined);
  });

  var getFitnessVals = function(labelVal) {
    var labeledSubtree = qa.findSubtree(labelVal, taxonomy)
    return map(function(objectVal) {
      // match if object is a decendent of the labelVal 
      // have to hack it a bit if the label is a leaf of the tree
      var match = (labeledSubtree == null  
        ? objectVal == labelVal 
        : qa.isNodeInTree(objectVal, labeledSubtree))
      // will eventually want to sample instead of fixing at 0...
      return match ? 0 : -Infinity
    }, qudSpace)
  }

  var fitnessMat = function() {
    reduce(function(labelVal, memo) {
      var innerDict = _.object(qudSpace, getFitnessVals(labelVal))
      return _.extend(memo, _.object([[labelVal,innerDict]]))
    }, {}, labelSpace)
  }

  // For "x@n."-style answers, the question doesn't play any role.
  var literalListener = cache(
    function(question, answer){
      Enumerate(function(){
        var world = worldPrior();
        var questionMeaning = meaning(question);
        var answerMeaning = meaning(answer);
        condition(answerMeaning(questionMeaning)(world));
        return world;
      });
    }
    );


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

var literalQuestioner = cache(
  function(qud_node, rationality) {
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
          var answer = sample(literalAnswerer(question, trueWorld, rationality));
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
  }
);
  

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
            var fitness = fitnessMat()
            var questionNode = questionToNode(question);
            var subtree = qa.findSubtree(questionNode, taxonomy);
            var leavesBelowNode = subtree === null ? [questionNode] : qa.leaves(subtree);
            var leafOfInterest = uniformDraw(leavesBelowNode);

            // factor based on fitness of label to object
            factor(fitness[questionNode][leafOfInterest])

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
  return {qudSpace : qudSpace,
  	      questionSpace : questionSpace,
  	      exampleWorld : exampleWorld,
          pragQ : pragmaticQuestioner,
          litQ : literalQuestioner,
          expQ: explicitQuestioner,
          pragA : pragmaticAnswerer,
          litA : literalAnswerer,
          expA: explicitAnswerer}
}

var main = function(){

  var rationalityPs = _.range(1, 10, .1)

  var conditions = [{filename: "branchingAnswerers.csv", gameObj : condition1},
                    {filename: "overlappingAnswerers.csv", gameObj: condition2},
                    {filename: "equivocalAnswerers.csv", gameObj: condition3}]

  map(function(expCond) {
    // Set up file
    var fileName = expCond.filename
    qa.writeCSV([["modelLevel", "question", "rationality", "response", "modelProb"]], fileName)
    var model = QAmodel(expCond.gameObj)
    map(function(rationality) {
      // Set up r to be nice
      var r = rationality.toFixed(1)

      map(function(question) {
        // // get relevant parameters
        var world = expCond.gameObj.exampleWorld
        var questions = expCond.gameObj.questionSpace

        var litA = model.litA
        var erp = litA(question, model.exampleWorld, r)
        var label = ["literal", "Q:" + question, r]
        console.log(label)
        qa.writeERP(erp, label, fileName)

        var pragA = model.pragA
        var erp = pragA(question, model.exampleWorld, r)
        var label = ["pragmatic", "Q:" + question, r]
        console.log(label)
        qa.writeERP(erp, label, fileName)

        var expA = model.expA
        var erp = expA(question, model.exampleWorld, r)
        var label = ["explicit", "Q:" + question, r]
        console.log(label)
        qa.writeERP(erp, label, fileName)
      }, model.questionSpace)
    }, rationalityPs)
  }, conditions)
  return 'done';

//  var rationalityPs = [2,4]

  // var f_ans = function(question,rationality){
  //   qa.printERP(explicitAnswerer(question, world,rationality));
  // };
  // var f_q = function(qudNode,rationality) {
  //   qa.printERP(explicitQuestioner(qudNode,rationality))
  // };
  // var f_prag_ans = function(question,rationality){
  //   qa.printERP(pragmaticAnswerer(question, world,rationality));
  // };
  // var f_prag_q = function(qudNode, rationality) {
  //   qa.printERP(pragmaticQuestioner(qudNode,rationality))
  // };

  // map(function(rationality) {
  //   map(function(qudNode) {
  //     var label = [qudNode, rationality]
  //     console.log(label)
  //     console.log("reg q")
  //     f_q(qudNode, rationality)
  //     console.log("prag q")
  //     f_prag_q(qudNode, rationality)
  //   }, qudNodes)
  // }, rationalityPs)

  // return 'done';
};


//   map(function(rationality) {
//     map(function(question) {
//       var label = [question, rationality]
//       console.log(label)
//       console.log("reg q")
// //      f_q(qudNode, rationality)
//       f_ans(question, rationality)
//       console.log("prag q")
// //      f_prag_q(qudNode, rationality)
//       f_prag_ans(question, rationality)
//     }, questions)
//   }, rationalityPs)

//   return 'done';
// };

main();
