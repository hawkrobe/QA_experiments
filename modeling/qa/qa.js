var _ = require('underscore');
var assert = require('assert');
var fs = require('fs');

var babyparse = require('babyparse');

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8')).data;
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
     var prob = Math.exp(erp.score(v));
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

// Note this is highly specific to a single type of erp
var bayesianErpWriter = function(erp, filePrefix) {
  var predictiveFile = fs.openSync(filePrefix + "Predictives.csv", 'w');
  fs.writeSync(predictiveFile, ["parameter", "item1", 
				"item2", "value", "alpha", "beta", "expPragFlip", 
				"prob", "MCMCprob"] + '\n');

  var paramFile = fs.openSync(filePrefix + "Params.csv", 'w');
  fs.writeSync(paramFile, ["parameter", "value", "MCMCprob"] + '\n');

  var supp = erp.support();
  supp.forEach(function(s) {
    supportWriter(s.predictive, Math.exp(erp.score(s)), predictiveFile);
    supportWriter(s.params, Math.exp(erp.score(s)), paramFile);
  });
  fs.closeSync(predictiveFile);
  fs.closeSync(paramFile);
  console.log('writing complete.');
};

var supportWriter = function(s, p, handle) {
  var sLst = _.pairs(s);
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
      return (row[1] === domain &&
	      row[3] === question &&
	      row[6] === type);
    };
  } else if (goal) {
    cond = function(row) {
      return (row[1] === domain &&
	      row[2] === goal &&
	      row[6] === type);
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
      probObj = _.extend(probObj, _.object([obj.response], [obj.prop]));
    });
    tax = _.extend(tax, _.object([label],[probObj]));
  }
  
  // Add knowledge about responses to taxonomy
  for (var responseId = 0; responseId < responses.length; responseId++) {
    var response = responses[responseId];
    tax = _.extend(tax, _.object([response], [_.object([response], [1])]));
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
  var relevantResponses = _.unique(_.pluck(relevantEmpKnowledge, 'response'));
  var relevantLabels =  _.unique(_.pluck(relevantEmpKnowledge, 'label'));
  var unifTax = buildTax(relevantUnifKnowledge, relevantLabels, relevantResponses);
  var empTax = buildTax(relevantEmpKnowledge, relevantLabels, relevantResponses);

  return {empTaxonomy: empTax, unifTaxonomy : unifTax,
	  qudSpace : relevantResponses, labelSpace : relevantLabels};
};

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
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

module.exports = {
  arraysEqual: arraysEqual,
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
  writeCSV: writeCSV,
  appendCSV: appendCSV,
  writeERP: writeERP,
  bayesianErpWriter: bayesianErpWriter,
  normalizeArray: normalizeArray,
  getSubset: getSubset,
  capitalize: capitalize,
  orderIsEqual: orderIsEqual
};
