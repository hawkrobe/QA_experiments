///fold:

var getUtility = function(dp, action, world){
  return dp.utility[world][action];
};

var cmd_print = function(erp) {
  map(function(v) {console.log({val: v, prob: Math.exp(erp.score([], v))})}, erp.support())
}

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
		}, _.range(input.length))
	}
	doPerm();
	return permArr
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
		map(function(pair){return _leaves(pair[0], pair[1]);},
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
    flower: null // no good category for this thing
  }
};

var nonRootNodes = nodes(taxonomy).slice(1); // everything except 'thing'

var worldSpace = map(function(perm) {
  return _.object(leaves(taxonomy), perm)
}, permute([1,2,3,4]))

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
    return uniformDraw(map(function(node) {return world[node];}, leavesBelowNode));
  };
};

var qudNodePrior = function() {
	return uniformDraw(['dalmatian', 'poodle', 'siamese', 'flower', 'dog'])
}

var questionSpace = ['null'].concat(['animal@1?', 'dog@1?', 'dalmatian@1?']);

var questionPrior = function() {
  return uniformDraw(questionSpace);
};

var isTaxonomyQuestion = function(x){
  return (last(x) === '?') & (isNodeInTree(butLast(x).split("@")[0], taxonomy));
};

// in our case, the meaning of the question should be equivalent to the qud, 
// a mapping from a world to set of values we're interested in...
var taxonomyQuestionMeaning = cache(function(utterance){
  var temp = utterance.split("@")
  var node = temp[0]; 
  console.log("node is " + node)
  var location = butLast(temp[1]);
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(world){
    // return true if world appears as one of the leaves below utterance node
//    console.log(leavesBelowNode)
//    return map(function(node) {return world[node];}, leavesBelowNode);

    var truth_val = reduce(function(node, rest) {return (world[node] == location) | rest}, 
      false, leavesBelowNode); 
	return truth_val

    //return uniformDraw(map(function(node) {return world[node];}, leavesBelowNode));
  //    return find(function(leaf){return leaf===world;}, leavesBelowNode) !== undefined;
  };
});


// Answers

var polarAnswerSpace = ['yes.', 'no.'];

var fullAnswerSpace = polarAnswerSpace.concat(
  flatten(map(function(leaf){
    map(function(loc){
      return leaf + '@' + loc + ".";
    }, [1,2,3,4])
  }, leaves(taxonomy))));
  
var fullAnswerPrior = function(){
  return uniformDraw(fullAnswerSpace);
};

var isPolarAnswer = function(x){
  return _.contains(polarAnswerSpace, x);
};

var isTaxonomyAnswer = function(x){
  return (last(x) === '.') & (isNodeInTree(butLast(x).split("@")[0], taxonomy));
};

var polarAnswerMeaning = cache(function(utterance){
  return (utterance == 'yes.' ? identity :
          utterance == 'no.' ? negate :
          undefined);
});

// note: the meaning of a taxonomy answer is independent of  the question
// in guessing game, answers are all leaves...
var taxonomyAnswerMeaning = cache(function(utterance){
  var temp = utterance.split("@")
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

var valDP_hardMax = function(question, dp) {
  return mean(function(){
    var trueWorld = worldPrior();
    var actionAndEU = maxWith(
      function(action){
        var expectedUtility = mean(function(){
          // If I ask this question, what answer do I expect to get?
          var answer = sample(answerer(question, trueWorld))
          // Given this answer, how do I update my distribution on worlds?
          var world = sample(literalListener(question, answer));
          return getUtility(dp, action, world);
        });
        return expectedUtility;
      },
      dp.actions);
    return actionAndEU[1];
  });
};

var questioner = function(dp) {
  Enumerate(function(){
    var utterance = questionPrior();
    var value = valDP_hardMax(utterance, dp) - valDP_hardMax("null", dp);
    console.log([utterance, value]);
    factor(value);
    return utterance;
  });
};

// Questioner is REALLY concerned with whether you have a siamese cat.
// If you have one, they want to make sure they guess correctly -- 
// If you don't, they have a slight preference not to guess wrong
//    (and also not to accidentally guess siamese)
var dp_id = {
  actions: [0, 1, 2, 3], // "guess dog1, dog2, cat1, basil1"
  utility: {
    dalmatian: [ 1, 0,-1, 0], // utility[world][action]
  	poodle :   [ 0, 1,-1, 0],
  	siamese:   [-1,-1, 5,-1],
  	basil:     [ 0, 0,-1, 1]}
};

// Questioner only cares whether you have a dog; it doesn't matter what kind.
// Again, slight bias not to guess wrong, 
//      (and not to guess a dog when you don't have one)
var dp_DOGS = {
  actions: [0, 1, 2, 3], // "guess dog1, dog2, cat1, basil1"
  utility: {
    dalmatian: [ 3,  3, -1,-1], // utility[world][action]
    poodle:    [ 3,  3, -1,-1],
    siamese:   [-1, -1,  1, 0],
    basil:     [-1, -1,  0, 1]}
};


cmd_print(questioner(dp_id));
//console.log("\n")
//cmd_print(questioner(dp_DOGS));
