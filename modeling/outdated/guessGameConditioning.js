// Run as:
// webppl guessGameConditioning.js --require-js ./qa

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

var qudNodePrior = function() {
  return uniformDraw(['dalmatian', 'poodle', 'siamese', 'flower']);
};

var questionSpace = ['whereIsAnimal?', 'whereIsDog?', 'whereIsDalmatian?', 'whereIsThing?'];

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
        // 1. Restrict to truthful answers
        factor(literalListener(question, answer).score([], trueWorld));
        // 2. Score answer based on expected probability of communicating question predicate value
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
        factor(Math.log(score));
        return answer;
      });
  });


var main = function(){
  var world = {poodle: 1, dalmatian: 2, siamese: 3, flower: 4};
  var questions = ['whereIsDalmatian?', 'whereIsDog?', 'whereIsAnimal?', 'whereIsThing?'];
  var f = function(question){
    console.log(question);
    qa.printERP(literalAnswerer(question, world));
  };
  map(f, questions);
  return 'done';
};

main();