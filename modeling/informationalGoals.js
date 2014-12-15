///fold:

var KL = function(erpTrue, erpApprox){
  var values = erpTrue.support([]);
  var xs = map(
    function(value){
      var p = Math.exp(erpTrue.score([], value));
      var q = Math.exp(erpApprox.score([], value));
      if (p == 0.0){
        return 0.0
      } else {
        return p * Math.log(p / q);
      }
    },
    values);
  return sum(xs);  
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
  return flatten(
    map(
      function(key){return _leaves(key, obj);},
      _.keys(obj)));
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
      cat: {
        siamese: null
      }
    },
    plant: {
      basil: null
    }
  }
};

var nonRootNodes = nodes(taxonomy).slice(1); // everything except 'thing'

var worldPrior = function() {
  return uniformDraw(leaves(taxonomy));
};


// Questions

var questionSpace = ['null'].concat(
  map(function(node){return node + '?';},
      nonRootNodes));

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  return (last(x) === '?') & (isNodeInTree(butLast(x), taxonomy));
};

var taxonomyQuestionMeaning = cache(function(utterance){
  var node = butLast(utterance); // remove ? at the end
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(world){
    // return true if world appears as one of the leaves below
    // utterance node
    return find(function(leaf){return leaf===world;}, leavesBelowNode) !== undefined;
  };
});


// Answers

var polarAnswerSpace = ['yes.', 'no.'];

var fullAnswerSpace = polarAnswerSpace.concat(
  map(function(node){return node + '.';},
      nonRootNodes));

var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isPolarAnswer = function(x){
  return _.contains(polarAnswerSpace, x);
};

var isTaxonomyAnswer = function(x){
  return (last(x) === '.') & (isNodeInTree(butLast(x), taxonomy));
};

var polarAnswerMeaning = cache(function(utterance){
  return (utterance == 'yes.' ? identity :
          utterance == 'no.' ? negate :
          undefined);
});

var taxonomyAnswerMeaning = cache(function(utterance){
  var node = butLast(utterance); // remove . at the end
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(pred){
    return function(x){
      return _.contains(leavesBelowNode, x);
    };
  };
});


// Sentence meaning (questions and answers)

var meaning = cache(function(utterance){
  return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance) :
          isPolarAnswer(utterance) ? polarAnswerMeaning(utterance) :
          isTaxonomyAnswer(utterance) ? taxonomyAnswerMeaning(utterance) :
          utterance === 'null' ? function(w){return true;} :
          undefined);
});



// Agents

var literalListener = cache(function(question, answer){
  Enumerate(function(){
    var world = worldPrior();
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
});

// This answerer does not try to be informative with respect to the QUD
var answerer = cache(function(question, trueWorld) {
  Enumerate(function(){
    var answer = (question === 'null') ? 'yes.' : fullAnswerPrior();
    // condition on listener inferring the true world given this answer
    factor(literalListener(question, answer).score([], trueWorld));
    return answer;
  });
});

var questioner = function(qud) {
  Enumerate(function(){
    var question = questionPrior();
    var prior = Enumerate(function(){
      // What is the value of the predicate I care about
      // under my prior?
      return qud(worldPrior());
    });
    var expectedKL = mean(
      function(){
        // What do I expect the world to be like?
        var trueWorld = worldPrior();
        var posterior = Enumerate(function(){
          // If I ask this question, what answer do I expect to get,
          // given what the world is like?
          var answer = sample(answerer(question, trueWorld));
          // Given this answer, how would I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          // What is the value of the predicate I care about under this
          // new distribution on worlds?
          return qud(world);
        });
        return KL(posterior, prior);
      });
    factor(expectedKL);
    return question;
  });
};

// returns a function that maps world to boolean indicating whether
// it is among the leaves below node in taxonomy
var makeQUD = function(node){
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(world){
    return _.contains(leavesBelowNode, world);
  };
};

print(questioner(makeQUD('dog')));
print(questioner(makeQUD('dalmatian')));
print(questioner(makeQUD('animal')));
