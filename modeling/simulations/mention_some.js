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
  people: {
    James : null,
    Alice : null,
    Susan : null,
    Bill  : null
	}
};

// All possible assignments of leaves to boolean values indicating whether they will go to party
var worldSpace = map(
  function(perm) {
    return _.object(qa.leaves(taxonomy), perm);
  }, qa.TFCartesianProd(qa.leaves(taxonomy).length));

var worldPrior = function() {
  return uniformDraw(worldSpace);
};

// Questions

var uniqueQuestion = 'who will be at the concert?';

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  return x == questionSpace[0]
};

var questionToNode = function(utterance){
  var temp = qa.butLast(utterance).split("Are");
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

// Can tell questioner whether one or more people was there
var fullAnswerSpace = qa.flatten(map(
  function(personSet){
    map(function(TFSet){
      qa.flatten(map2(function(person, TF){
      return person + ':' + TF + ",";
      }, personSet, TFSet))
    }, qa.TFCartesianProd(personSet.length));
  }, filter(function(v){return v.length > 0},
    qa.powerset(qa.leaves(taxonomy)))));

var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isTaxonomyAnswer = function(x){
  var person_pairs = qa.butLast(x).split(',')
  return all(function(v){
    return qa.isNodeInTree(v.split(":")[0], taxonomy)
  }, person_pairs)
//  return (last(x) === '.') & (qa.isNodeInTree(butLast(x).split(",")[0], taxonomy));
};

var taxonomyAnswerMeaning = cache(function(utterance){
  return function(pred){
    return function(x){
      var person_pairs = qa.butLast(utterance).split(',')
      return all(function(v){
        var pair = v.split(":")
        var person = pair[0]
        var truth_val = pair[1]
        return x[person] == truth_val
      }, person_pairs)
    };
  };
});

// // Sentence meaning (questions and answers)

var meaning = cache(function(utterance){
  return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance) :
          isTaxonomyAnswer(utterance) ? taxonomyAnswerMeaning(utterance) :
          utterance === 'null' ? function(w){return true;} :
          undefined);
});


// // For "x@n."-style answers, the question doesn't play any role.
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
  function(question, trueWorld, ansRationality) {
    // Pick answer conditioned on communicating question predicate value
    return Enumerate(
      function(){
        var answer = fullAnswerPrior();
        factor(literalListener(question, answer).score([], trueWorld) * ansRationality);
        return answer;
      });
  });

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
            var subtree = qa.findSubtree(questionNode, taxonomy);
            var leavesBelowNode = subtree === null ? [questionNode] : qa.leaves(subtree);
            var leafOfInterest = uniformDraw(leavesBelowNode);
            // Did the listener infer the correct location of the leaf
            // node of interest?
            var inferredWorld = sample(literalListener(question, answer));
            var inferredPosition = inferredWorld[leafOfInterest];
            var truePosition = trueWorld[leafOfInterest];
            return (truePosition == inferredPosition) ? 1 : 0;
          });
        factor(Math.log(score) * ansRationality);
        return answer;
      });
  });

var questioner = cache(function(qud_node, ansRationality, KLRationality) {
  var qud = (makeQUD(qud_node))
  Enumerate(function(){
    console.log("evaluating question for qud " + qud_node)
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
        var answer = sample(explicitAnswerer(question, trueWorld, ansRationality));
        var posterior = Enumerate(function(){
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under
          // this new distribution on worlds?
          return qud(world);
        });
        return qa.KL(posterior, prior);
      });
    factor(expectedKL * KLRationality);
    console.log(question)
    return question;
  });
});

var pragmaticAnswerer = cache(function(question, trueWorld, ansR, KLR, qudR, pragR){
  var qudNodePosterior = Enumerate(function(){
    var qudNode = qudNodePrior();
    var q_erp = questioner(qudNode, ansR, KLR);
    factor(q_erp.score([], question) * qudR);
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
    factor(Math.log(score) * pragR);
    return answer;
  });
})

var myCartesianProductOf = function(listOfLists) {
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

console.log("this is no probs")
console.log(myCartesianProductOf([[1,2], [1,2]]))

// var w = worldSpace[0]
// console.log(w)
// qa.printERP(pragmaticAnswerer('whoArePeople?', w, 1, 1, 1, 3))

// var pragmaticQuestioner = cache(function(qud_node) {
//   var qud = (makeQUD(qud_node))
//   Enumerate(function(){
//     var question = questionPrior();
//     // What is the gate value I'd guess under my prior?
//     var prior = Enumerate(function(){
//       return qud(worldPrior());
//     });
//     var expectedKL = mean(
//       function(){
//         // What do I expect the world to be like?
//         var trueWorld = worldPrior();
//         var posterior = Enumerate(function(){
//           // If I ask this question, what answer do I expect to get,
//           // given what the world is like?
//           var answer = sample(pragmaticAnswerer(question, trueWorld));
//           // Given this answer, how would I update my distribution on worlds?
//           var world = sample(literalListener(question, answer));
//           // What is the value of the predicate I care about under
//           // this new distribution on worlds?
//           return qud(world);
//         });
//         return KL(posterior, prior);
//       });
//     factor(expectedKL);
//     return question;
//   });
// });

// var main = function(){
//   var world = {poodle: 1, dalmatian: 2, siamese: 3, flower: 4};
//   var questions = ['whereIsDalmatian?', 'whereIsDog?', 'whereIsAnimal?', 'whereIsThing?'];
//   var qudNodes = ['dalmatian', 'poodle', 'siamese', 'flower']
//   var f_ans = function(question){
//     console.log(question);
//     printERP(literalAnswerer(question, world));
//   };
//   var f_q = function(qudNode) {
//     console.log(qudNode);
//     printERP(questioner(qudNode))
//   };
//   var f_prag_ans = function(question){
//     console.log(question);
//     printERP(pragmaticAnswerer(question, world));
//   };
//   var f_prag_q = function(qudNode) {
//     console.log(qudNode);
//     printERP(pragmaticQuestioner(qudNode))
//   };
//   //map(f_ans, questions)
//   //map(f_q, qudNodes)
//   map(f_prag_q, qudNodes);
//   //map(f_prag_ans, questions)
//   return 'done';
// };

// main();
