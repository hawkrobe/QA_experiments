var _ = require('underscore');
var assert = require('assert');

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
  var values = erpTrue.support([]);
  var xs = values.map(
    function(value){
      var p = Math.exp(erpTrue.score([], value));
      var q = Math.exp(erpApprox.score([], value));
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
    result.push(['true', 'false'])
  })
  return cartesianProductOf(result);
}

var permute = function (input) {
  var input = input.slice();
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

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

var printERP = function(erp) {
  erp.support().map(
    function(v) {
      var prob = Math.exp(erp.score([], v));
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

var erpOrder = function(erp){
  var scores = erp.support([]).map(function(v){
    return erp.score([], v);
  });
  return sortWithIndices(scores).sortIndices;
};

var orderIsEqual = function(erp1, erp2){
  assert.ok(arraysEqual(erp1.support([]), erp2.support([])));
  return arraysEqual(erpOrder(erp1), erpOrder(erp2));
};

module.exports = {
  arraysEqual: arraysEqual,
  setsEqual: setsEqual,
  powerset: powerset,
  flatten: flatten,
  permute: permute,
  KL: KL,
  cartesianProductOf: cartesianProductOf,
  TFCartesianProd : TFCartesianProd,
  isNodeInTree: isNodeInTree,
  findSubtree: findSubtree,
  leaves: leaves,
  nodes: nodes,
  butLast: butLast,
  printERP: printERP,
  orderIsEqual: orderIsEqual
};
