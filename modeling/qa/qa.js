var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');

var babyparse = require('babyparse');

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8'), {
    header: true,
    keepEmptyRows:false,
    skipEmptyLines: true
  }).data;
};

function readJSON(filename){
  return require(filename);
};

function writeCSV(jsonCSV, filename){
  fs.writeFileSync(filename, babyparse.unparse(jsonCSV) + '\n');
}

function appendCSV(jsonCSV, filename){
  fs.appendFileSync(filename, babyparse.unparse(jsonCSV) + '\n');
}

var writeERP = function(erp, labels, filename, fixed) {
  var data = _.filter(erp.support().map(
   function(v) {
     var prob = erp.score(v);
     if (prob > 0.0){
      if(v.slice(-1) === ".")
        out = butLast(v);
      else if (v.slice(-1) === "?")
        out = butLast(v).split("Is")[1].toLowerCase();
      else 
        out = v
      return labels.concat([out, String(prob.toFixed(fixed))]);

    } else {
      return [];
    }
  }
  ), function(v) {return v.length > 0;});
  appendCSV(data, filename);
};

var writeSpatialQuestioner = function(filename, labels, erp) {
  var data = _.filter(erp.support().map(function(v) {
    var prob = erp.score(v);
    if (Math.exp(prob) > 0.01){
      var out = butLast(v).split("_")[1];
      return labels.concat([out, String(Math.exp(prob).toFixed(2))]);
    } else {
      return [];
    }
  }), function(v) {return v.length > 0;});
  appendCSV(data, filename);
};

var writeSpatialAnswerer = function(filename, labels, erp) {
  var data = _.filter(erp.support().map(function(v) {
    var prob = erp.score(v);
    if (Math.exp(prob) > 0.01){
      return labels.concat([v, String(Math.exp(prob).toFixed(2))]);
    } else {
      return [];
    }
  }), function(v) {return v.length > 0;});
  appendCSV(data, filename);
};

// Note this is highly specific to a single type of erp
var bayesianErpWriter = function(erp, filePrefix) {
  var predictiveFile = fs.openSync(filePrefix + "Predictives.csv", 'w');
  fs.writeSync(predictiveFile, ["stim", "item1", "item2", "value",
				"alpha_A", "alpha_Q", "w", "modelType",
				"prediction", "posteriorProb"] + '\n');

  var paramFile = fs.openSync(filePrefix + "Params.csv", 'w');
  fs.writeSync(paramFile, ["alpha_A", "alpha_Q", "w", "modelType",
			   "logLikelihood", "posteriorProb"] + '\n');

  var supp = erp.support();
  supp.forEach(function(s) {
    supportWriter(s.predictive, erp.score(s), predictiveFile);
    supportWriter(s.params, erp.score(s), paramFile);
  });
  fs.closeSync(predictiveFile);
  fs.closeSync(paramFile);
  console.log('writing complete.');
};

var supportWriter = function(s, p, handle) {
  var sLst = _.toPairs(s);
  var l = sLst.length;

  for (var i = 0; i < l; i++) {
    fs.writeSync(handle, sLst[i].join(',')+','+p+'\n');
  }
}

var capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var sum = function(xs){
  if (xs.length == 0) {
    return 0.0;
  } else {
    var total = _(xs).reduce(
      function(a, b) {
        return a + b;
      });
    return total;
  }
};

var KL = function(erpTrue, erpApprox){
  var values = erpTrue.support();
  var xs = values.map(
    function(value){
      var p = Math.exp(erpTrue.score(value));
      var q = Math.exp(erpApprox.score(value));
      if (p == 0.0){
        return 0.0;
      } else {
        return p * Math.log(p / q);
      }
    });
  return sum(xs);
};

var flatten = function(xs){
  if (xs.length == 0) {
    return [];
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
};

function setsEqual(a1, a2){
  var s1 = a1.slice().sort();
  var s2 = a2.slice().sort();
  return JSON.stringify(s1) === JSON.stringify(s2);
}

function arraysEqual(a1, a2){
  return JSON.stringify(a1) === JSON.stringify(a2);
}

function powerset(set) {
  if (set.length == 0)
    return [[]];
  else {
    var rest = powerset(set.slice(1));
    return rest.map(
      function(element) {
        return [set[0]].concat(element);
      }).concat(rest);
  }
}

// Sometimes you just need all possible combination of true and false
var TFCartesianProd = function(n) {
  var result = [];
  _.map(_.range(n), function(i){
    result.push(['true', 'false']);
  });
  return cartesianProductOf(result);
};

var permute = function (old_input) {
  var input = old_input.slice();
  var permArr = [];
  var usedChars = [];
  var doPerm = function() {
    if (input.length == 0) {
      permArr.push(usedChars.slice());
    }
    _.range(input.length).map(
      function(i) {
        var ch = input.splice(i, 1)[0];
        usedChars.push(ch);
        doPerm();
        usedChars.pop();
        input.splice(i, 0, ch);
      });
  };
  doPerm();
  return permArr;
};

var cartesianProductOf = function(listOfLists) {
  return _.reduce(listOfLists, function(a, b) {
    return _.flatten(_.map(a, function(x) {
      return _.map(b, function(y) {
        return x.concat([y]);
      });
    }), true);
  }, [ [] ]);
};

var getSubset = function(data, options) {
  var type = options.type, domain = options.domain,
      question = options.question, goal = options.goal;
  var cond;
  if (question) {
    cond = function(row) {
      return (row.domain === domain &&
	      row.question === question &&
	      row.type === type);
    };
  } else if (goal) {
    cond = function(row) {
      return (row.domain === domain &&
	      row.goal === goal &&
	      row.type === type);
    };
  }
  return _.filter(data, cond);
};

// recursively traverse object; return all keys
var nodes = function(obj){
  if (obj === null){
    return [];
  } else {
    var keys = _.keys(obj);
    var subkeys = flatten(_.values(obj).map(nodes));
    return keys.concat(subkeys);
  }
};

var _leaves = function(key, obj){
  if (obj === null){
    return [key];
  } else {
    var pairs = _.pairs(obj);
    return flatten(
      pairs.map(
        function(pair){return _leaves(pair[0], pair[1]);}));
  }
};

// recursively traverse object; return all keys that map to null
var leaves = function(obj){
  var pairs = _.pairs(obj);
  return _.unique(flatten(
    pairs.map(
      function(pair){return _leaves(pair[0], pair[1]);})));
  };

// recursively traverse object; return value of key
var findSubtree = function(key, obj){
  if (obj[key] !== undefined){
    return obj[key];
  } else {
    var xs = _.values(obj).map(
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
      });
    return _.find(xs, function(x){return x !== undefined;});
  }
};

var isNodeInTree = function(node, tree){
  return findSubtree(node, tree) !== undefined;
};

var normalizeArray = function(xs) {
  var Z = sum(xs);
  return xs.map(function(x) {
    return x / Z;
  });
};

var buildTax = function(knowledge, labels, responses) {
  // Add knowledge about labels to taxonomy
  var tax = {};

  for (var labelId = 0; labelId < labels.length; labelId++) {
    var probObj = {};
    var label = labels[labelId];
    var labelMatches = _.filter(knowledge, function(obj) {return obj.label == label;});
    _.forEach(labelMatches, function(obj) {
      probObj = _.extend(probObj, _.fromPairs([[obj.response, obj.prop]]));
    });
    tax = _.extend(tax, _.fromPairs([[label, probObj]]));
  }
  
  // Add knowledge about responses to taxonomy
  for (var responseId = 0; responseId < responses.length; responseId++) {
    var response = responses[responseId];
    tax = _.extend(tax, _.fromPairs([[response, _.fromPairs([[response, 1]])]]));
  }

  return tax;
};

var buildKnowledge = function(type, domain) {
  // use appropriate knowledge
  var unifKnowledge = require("./saliencyKnowledgeUniform.json");
  var empKnowledge = require("./saliencyKnowledgeEmpirical.json");
  var filterFunc = function(obj) {
    return obj.type === type && obj.domain === domain;
  };
  var relevantUnifKnowledge = _.filter(unifKnowledge, filterFunc);
  var relevantEmpKnowledge = _.filter(empKnowledge, filterFunc);
  var relevantResponses = _.uniq(_.map(relevantEmpKnowledge, 'response'));
  var relevantLabels =  _.uniq(_.map(relevantEmpKnowledge, 'label'));
  var unifTax = buildTax(relevantUnifKnowledge, relevantLabels, relevantResponses);
  var empTax = buildTax(relevantEmpKnowledge, relevantLabels, relevantResponses);
  return {empTaxonomy: empTax, unifTaxonomy : unifTax,
	  qudSpace : relevantResponses, labelSpace : relevantLabels};
};

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

// Meaning of answer is locations of all cards mentioned
var cardsLocationAnswerMeaning = function(utterance){
  return function(world){
    return _.every(utterance, function(v) {
      var components = v.split('_of_');
      return _.find(world, {rank: components[0], suit: components[1]})['location'];
    }) ? 1 : 0;
  };
};

var cardsNameToQUD = function(qudName) {
  var components = qudName.split("_of_");
  return function(world){
    return _.find(world, {rank: components[0], suit: components[1]})['location'];
  };
};

// Have to do two things in loop; compute normalizing constant & kernal thing
var cardsInterpreterScore = function(trueWorld, answer, qudName, worldDist) {
  var normalizingConstant = 0;
  var collapsedVal = 0;
  var worldStates = worldDist.support();
  var f = cardsLocationAnswerMeaning(answer);
  var qud = cardsNameToQUD(qudName);
  for(var i = 0; i < worldStates.length; i++) {
    var worldState = worldStates[i];
    var qudMatch = qud(trueWorld) === qud(worldState) ? 1 : 0;
    normalizingConstant += (f(worldState) * Math.exp(worldDist.score(worldState)));
    collapsedVal += (f(worldState) * Math.exp(worldDist.score(worldState)) * qudMatch);
  }
  return (Math.log(collapsedVal) -
	  Math.log(normalizingConstant));
};

var spatialLocationAnswerMeaning = function(utterance){
  return function(world){
    return _.every(utterance, function(v) {
      var components = v.split('_');
      return world[components[0]] === components[1];
    });
  };
};

var completeCol = function(qud, world) {
  var colVals = _.filter(_.keys(world), function(cellName) {return cellName[1] == qud;});
  return _.every(colVals, function(val) {return world[val] == 'safe'});
};

var completeRow = function(qud, world) {
  var rowVals = _.filter(_.keys(world), function(cellName) { return cellName[0] == qud;});
  return _.every(rowVals, function(val) {return world[val] == 'safe'});
};

var cellMatch = function(qud, world) {
  return world[qud] == 'safe';
};

var rows = ['A', 'B', 'C'];
var cols = ['1', '2', '3'];

// Project down to subspace of location of card in question
var spatialLocationQUD = function(qudName) {
  return function(world){
    return (_.includes(cols, qudName) ? completeCol(qudName, world) :
	    _.includes(rows, qudName) ? completeRow(qudName, world) :
	    cellMatch(qudName, world));
  };
};

var spatialNameToQUD = function(qudName){
  if(qudName == 'identity') 
    return function(w) {return w;};
  else if(qudName.length > 1) {
    return function(w) {return _.map(qudName, function(qud) {
      return spatialLocationQUD(qud)(w);
    });};
  }  else 
    return spatialLocationQUD(qudName);
};

// Have to do two things in loop; compute normalizing constant & kernal thing
var spatialInterpreterScore = function(trueWorld, answer, qudName, worldDist) {
  var normalizingConstant = 0;
  var collapsedVal = 0;
  var worldStates = worldDist.support();
  var f = spatialLocationAnswerMeaning(answer);
  var qud = spatialNameToQUD(qudName);
  for(var i = 0; i < worldStates.length; i++) {
    var worldState = worldStates[i];
    var qudMatch = _.isEqual(qud(trueWorld), qud(worldState)) ? 1 : 0;
    normalizingConstant += (f(worldState) * Math.exp(worldDist.score(worldState)));
    collapsedVal += (f(worldState) * Math.exp(worldDist.score(worldState)) * qudMatch);
  }
  return (Math.log(collapsedVal) -
	  Math.log(normalizingConstant));
};


function _logsumexp(a) {
  var m = Math.max.apply(null, a);
  var sum = 0;
  for (var i = 0; i < a.length; ++i) {
    sum += (a[i] === -Infinity ? 0 : Math.exp(a[i] - m));
  }
  return m + Math.log(sum);
}

var spatialA1Score = function(trueAnswer, question, world, config) {
  var qudName = butLast(question).split('_')[1];
  var scores = [];
  for(var i = 0; i < config.answers.length; i++) {
    var answer = config.answers[i];
    var utility = spatialInterpreterScore(world, answer, qudName, config.worldPrior);
    scores.push(utility);
  }
  var trueScore = spatialInterpreterScore(world, trueAnswer, qudName, config.worldPrior);
  return trueScore * config.rationality - _logsumexp(scores);
};

var cardA1Score = function(trueAnswer, question, world, config) {
  var qudName = butLast(question).split('_is_')[1];
  var normalizingConstant = 0;
  for(var i = 0; i <config.answers.length; i++) {
    var answer = config.answers[i];
    var utility = interpreterScore(world, answer, qudName, config.worldPrior);
    normalizingConstant += utility * config.rationality - answer.length;
  }
  console.log('after loop');
  var trueScore = interpreterScore(world, trueAnswer, qudName, config.worldPrior);
  return (Math.log(trueScore * config.rationality - trueAnswer.length) -
	  Math.log(normalizingConstant));
};

var printERP = function(erp) {
  erp.support().map(
    function(v) {
      var prob = Math.exp(erp.score(v));
      if (prob > 0.0){
        console.log({val: v, prob: prob});
      }
    }
  );
};

var sortWithIndices = function(toSort) {
  for (var i = 0; i < toSort.length; i++) {
    toSort[i] = [toSort[i], i];
  }
  toSort.sort(function(left, right) {
    return left[0] < right[0] ? -1 : 1;
  });
  toSort.sortIndices = [];
  for (var j = 0; j < toSort.length; j++) {
    toSort.sortIndices.push(toSort[j][1]);
    toSort[j] = toSort[j][0];
  }
  return toSort;
};

var getEveryFifthElement = function(list) {
  return _.filter(list, function(num, index) {
    return index % 5 == 0;
  })
}

var erpOrder = function(erp){
  var scores = erp.support().map(function(v){
    return erp.score(v);
  });
  return sortWithIndices(scores).sortIndices;
};

var orderIsEqual = function(erp1, erp2){
  assert.ok(arraysEqual(erp1.support(), erp2.support()));
  return arraysEqual(erpOrder(erp1), erpOrder(erp2));
};

var pickAllNewspaperCafes = function(world) {
  var trueCafes = _.keys(_.pick(world, function(value, key, object) {
    return value[1];
  }));
  if(_.isEmpty(trueCafes))
    return 'none'
  else 
    return trueCafes
};

var pickClosestNewspaperCafe = function(world) {
  var validPicks = _.pick(world, function(value, key, object) {
    return value[1];
  });
  if(_.isEmpty(validPicks))
    return 'none';
  else {
    return [_.min(_.keys(validPicks), function(k) {
      return validPicks[k][0];
    })];
  }
};

// Used these to speed stuff up...

//var answererModelOutput = readCSV('./spatialAnswererOutput_HierarchicalVersion.csv');
// var questionerModelOutput = require('../experiment3/spatialQuestionerOutput_HierarchicalVersion.json');

// function getQuestionerOutput(type, goal, gridState) {
//   var goalString = _.includes(goal, '1') ? 'columns': 'rows';

//   return _.filter(questionerModelOutput, {
//     questionerType : type,
//     gridState: JSON.stringify(gridState),
//     goal: goalString
//   });
// }

// function alreadyInOutput(world) {
//   return _.find(answererModelOutput, {world: world}) ? true : false;
// }

module.exports = {
  arraysEqual: arraysEqual,
  // alreadyInOutput : alreadyInOutput,
  // getQuestionerOutput : getQuestionerOutput,
  setsEqual: setsEqual,
  powerset: powerset,
  flatten: flatten,
  permute: permute,
  KL: KL,
  pickAllNewspaperCafes: pickAllNewspaperCafes,
  pickClosestNewspaperCafe: pickClosestNewspaperCafe,
  getEveryFifthElement : getEveryFifthElement,
  cartesianProductOf: cartesianProductOf,
  buildKnowledge : buildKnowledge,
  TFCartesianProd : TFCartesianProd,
  isNodeInTree: isNodeInTree,
  findSubtree: findSubtree,
  leaves: leaves,
  nodes: nodes,
  butLast: butLast,
  printERP: printERP,
  readCSV: readCSV,
  readJSON: readJSON,
  writeCSV: writeCSV,
  writeSpatialQuestioner: writeSpatialQuestioner,
  writeSpatialAnswerer: writeSpatialAnswerer,  
  cardsInterpreterScore: cardsInterpreterScore,
  spatialInterpreterScore: spatialInterpreterScore,
  completeRow :completeRow,
  completeCol : completeCol,
  cellMatch : cellMatch,
  cardA1Score: cardA1Score,
  spatialA1Score: spatialA1Score,  
  appendCSV: appendCSV,
  writeERP: writeERP,
  bayesianErpWriter: bayesianErpWriter,
  normalizeArray: normalizeArray,
  getSubset: getSubset,
  capitalize: capitalize,
  orderIsEqual: orderIsEqual
};
