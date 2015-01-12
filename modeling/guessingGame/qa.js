var _ = require('underscore');

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

function powerset(set) {
  if (set.length == 0)
    return [[]];
  else {
    var rest = powerset(set.slice(1));
    return rest.map(
      function(element) {
        return set[0] + element;
      }).concat(rest);
  }
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
  return flatten(
    pairs.map(
      function(pair){return _leaves(pair[0], pair[1]);}));
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
    function(v) {console.log({val: v, prob: Math.exp(erp.score([], v))});}
    );
};

module.exports = {
  setsEqual: setsEqual,
  powerset: powerset,
  flatten: flatten,
  permute: permute,
  KL: KL,
  isNodeInTree: isNodeInTree,
  findSubtree: findSubtree,
  leaves: leaves,
  nodes: nodes,
  butLast: butLast,
  printERP: printERP
};