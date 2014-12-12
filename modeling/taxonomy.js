///fold:

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

var worldPrior = function(dp) {
  return uniformDraw(dp.worlds);
};


// Questions

var questionNodes = nodes(taxonomy).slice(1); // don't ask "thing?"

var questionSpace = map(
  function(node){return node + "?";},
  questionNodes).concat(["null"]);

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isNodeInTree = function(node, tree){
  return findSubtree(node, tree) !== undefined;
};

var isTaxonomyQuestion = function(x){
  return (last(x) === "?") & (isNodeInTree(butLast(x), taxonomy));
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

var answerPrior = function(){
  var answerSpace = ["yes", "no"];
  return uniformDraw(answerSpace);
};



// Sentence meaning (questions and answers)

var meaning = cache(function(utterance){
  return (isTaxonomyQuestion(utterance) ? taxonomyQuestionMeaning(utterance):
          utterance == "yes" ? identity :
          utterance == "no" ? negate :
          function(w){return true;});
});



// Agents

var literalListener = cache(function(question, answer, dp){
  Enumerate(function(){
    var world = worldPrior(dp);
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
});

var answerer = cache(function(question, trueWorld, dp) {
  Enumerate(function(){
    var answer = (question == "null") ? "yes" : answerPrior();
    // condition on listener inferring the true world given this answer
    factor(literalListener(question, answer, dp).score([], trueWorld));
    return answer;
  });
});

var valDP_hardMax = function(question, dp) {
  return mean(function(){
    var trueWorld = worldPrior(dp);
    var actionAndEU = maxWith(
      function(action){
        var expectedUtility = mean(function(){
          // If I ask this question, what answer do I expect to get?
          var answer = sample(answerer(question, trueWorld, dp));
          // Given this answer, how do I update my distribution on worlds?
          var world = sample(literalListener(question, answer, dp));
          return dp.utility[world][action];
        });
        return expectedUtility;
      },
      dp.actions);
    return actionAndEU[1];
  });
};

var questioner = function(dp) {
  Enumerate(function(){
    var question = questionPrior();
    var value = valDP_hardMax(question, dp) - valDP_hardMax("null", dp);
    print([question, value]);
    factor(value);
    return question;
  });
};


// Decision problems

var actions = leaves(taxonomy);
var worlds = leaves(taxonomy);

// Questioner is REALLY concerned with whether you have a siamese cat.
// If you have one, they want to make sure they guess correctly --
// If you don't, they have a slight preference not to guess wrong
//    (and also not to accidentally guess siamese)
var dp_id = {
  actions: actions,    // "guess dog1, dog2, cat1, basil1"
  worlds:  worlds,     //       "dog1, dog2, cat1, basil1"
  utility: {           // utility[world][action]
    poodle: {
      poodle: 1,
      dalmatian: 0,
      siamese: -1,
      basil: 0
    },
    dalmatian: {
      poodle: 0,
      dalmatian: 1,
      siamese: -1,
      basil: 0
    },
    siamese: {
      poodle: -1,
      dalmatian: -1,
      siamese: 5,
      basil: -1
    },
    basil: {
      poodle: 0,
      dalmatian: 0,
      siamese: -1,
      basil: 1
    }
  }
};

// Questioner only cares whether you have a dog; it doesn't matter what kind.
// Again, slight bias not to guess wrong,
//      (and not to guess a dog when you don't have one)
var dp_DOGS = {
  actions: actions, // "guess dog1, dog2, cat1, basil1"
  worlds:  worlds,  // "dog1, dog2, cat1, basil1"
  utility: {        // utility[world][action]
    poodle: {
      poodle: 5,
      dalmatian: 5,
      siamese: -1,
      basil: -1
    },
    dalmatian: {
      poodle: 5,
      dalmatian: 5,
      siamese: -1,
      basil: -1
    },
    siamese: {
      poodle: -1,
      dalmatian: -1,
      siamese: 1,
      basil: 0
    },
    basil: {
      poodle: -1,
      dalmatian: -1,
      siamese: 0,
      basil: 1
    }
  }
};

print(questioner(dp_id));
print(questioner(dp_DOGS));
