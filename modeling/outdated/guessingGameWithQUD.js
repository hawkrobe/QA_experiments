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
    flower: null // no good category for this thing
  }
};

// All possible assignments of four objects to four positions
var worldSpace = map(function(perm) {
  return _.object(leaves(taxonomy), perm);
}, permute([1,2,3,4]));

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
  return uniformDraw(['dalmatian', 'poodle', 'siamese', 'flower']);
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
  var subtree = findSubtree(node, taxonomy);
  var leavesBelowNode = subtree === null ? [node] : leaves(subtree);
  return function(world){
    // map from a world to the one answer of interest
    return uniformDraw(map(function(node) {return world[node];}, leavesBelowNode));
  };
});

// Answers

// Can tell questioner about a location of one object
var polarAnswerSpace = [];

var fullAnswerSpace = flatten(map(function(leaf){
  map(function(loc){
    return leaf + '@' + loc + ".";
  }, [1,2,3,4]);
  }, leaves(taxonomy)));

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

// This answerer tries to be informative wrt the literal question
var tradAnswerer = cache(function(question, trueWorld) {
  console.log("calculating response distribution for question: " + question);
  console.log("in world: ");
  console.log(trueWorld);
  Enumerate(function(){
    var answer = (question === 'null') ? 'yes.' : fullAnswerPrior();
    var questionMeaning = meaning(question);
    // Be TRUTHFUL (get rid of answers that lead to false worlds)
    factor(literalListener(question, answer).score([], trueWorld));
    // Be RELEVANT(i.e. condition on listener inferring the correct qud value given this answer
    condition(questionMeaning(sample(literalListener(question, answer))) === questionMeaning(trueWorld));
    return answer;
  });
});

printERP(tradAnswerer("whereIsDalmatian?", {poodle: 2, dalmatian: 1, siamese: 3, flower: 4}));
printERP(tradAnswerer("whereIsDog?", {poodle: 2, dalmatian: 1, siamese: 3, flower: 4}));
printERP(tradAnswerer("whereIsAnimal?", {poodle: 2, dalmatian: 1, siamese: 3, flower: 4}));
printERP(tradAnswerer("whereIsThing?", {poodle: 2, dalmatian: 1, siamese: 3, flower: 4}));

// var tradQuestioner = cache(function(qud) {
//   Enumerate(function(){
//     var question = questionPrior();
//     console.log("asking " + question )
//     var prior = Enumerate(function(){
//       // What is the value of the predicate I care about
//       // under my prior?
//       return qud(worldPrior());
//     });
//     var expectedKL = mean(
//       function(){
//         // What do I expect the world to be like?
//         var trueWorld = worldPrior();
//         var posterior = Enumerate(function(){
//           // If I ask this question, what answer do I expect to get,
//           // given what the world is like?
//           var answer = sample(tradAnswerer(question, trueWorld));
//           // Given this answer, how would I update my distribution on worlds?
//           var world = sample(literalListener(question, answer));
//           // What is the value of the predicate I care about under this
//           // new distribution on worlds?
//           return qud(world);
//         });
//         console.log("if true world is ")
//         console.log(trueWorld)
//         console.log(" posterior is ")
//         printERP(posterior)
//         return KL(posterior, prior);
//       });
//     console.log("expectedKL for " + question + " is " + expectedKL)
//     factor(expectedKL);
//     return question;
//   });
// });

//printERP(tradQuestioner(makeQUD('dalmatian')));


// // This answerer does not try to be informative with respect to the QUD
// var pragAnswerer = cache(function(question, trueWorld) {
//   Enumerate(function(){
//   	var qud = makeQUD(qudNodePrior())
//   	var q_erp = tradQuestioner(qud)
//   	// upweight quds that are consistent with the question being asked
//   	factor(q_erp.score([], question))

//   	var answer = (question === 'null') ? 'yes.' : fullAnswerPrior();
//     // condition on listener inferring the true world given this answer
//     var questionMeaning = meaning(question);
//     condition(qud(sample(literalListener(question, answer))) === qud(trueWorld));
//     return answer;
//   });
// });

// var pragQuestioner = function(qud) {
//   Enumerate(function(){
//     var question = questionPrior();
//     console.log("asking " + question )
//     var prior = Enumerate(function(){
//       // What is the value of the predicate I care about
//       // under my prior?
//       return qud(worldPrior());
//     });
//     console.log("prior is: ")
//     printERP(prior)
//     var expectedKL = mean(
//       function(){
//         // What do I expect the world to be like?
//         var trueWorld = worldPrior();
//         var posterior = Enumerate(function(){
//           // If I ask this question, what answer do I expect to get,
//           // given what the world is like?
//           var answer = sample(pragAnswerer(question, trueWorld));
//           // Given this answer, how would I update my distribution on worlds?
//           var world = sample(literalListener(question, answer));
//           // What is the value of the predicate I care about under this
//           // new distribution on worlds?
//           return qud(world);
//         });
//         return KL(posterior, prior);
//       });
//     console.log("expectedKL for " + question + " is " + expectedKL)
//     factor(expectedKL);
//     return question;
//   });
// };

//console.log(permute([1,2,3,4]))
// console.log("\n")
//pragAnswerer("dalmatian@1?", {poodle: 1, dalmatian: 2, siamese: 3, vorp: 4})
//printERP(questioner(makeQUD('dalmatian')));
// console.log("\n")
// printERP(questioner(makeQUD('animal')));
