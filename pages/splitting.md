---
layout: page
title: Splitting random choices
status: other
---

~~~~
///fold:

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

///

var testERP = makeERP([.1, .2, .3, .4], 
                      ["x1", "x2", "x3", "y1"]);

print(testERP)
~~~~

Here is the corresponding two-stage sampling process, resulting in the same marginal distribution:

~~~~
///fold:
var coarsenERP = function(erp, coarsenValue){

  // Get concrete values and probabilities
  
  var allVs = erp.support([]);
  var allPs = map(function(v){return Math.exp(erp.score([], v));}, allVs);

  // Group distribution based on equivalence classes
  // implied by coarsenValue function

  var groups = groupBy(
    function(vp1, vp2){
      return coarsenValue(vp1[0]) == coarsenValue(vp2[0]);
    },
    zip(allVs, allPs));
  
  var groupSymbols = map(
    function(group){
      // group[0][0]: first value in group
      return coarsenValue(group[0][0])},
    groups)

  var groupedVs = map(
    function(group){
      return map(first, group);
    },
    groups);

  var groupedPs = map(
    function(group){
      return map(second, group);
    },
    groups);

  // Construct unconditional (abstract) sampler and
  // conditional (concrete) sampler

  var abstractPs = map(sum, groupedPs);
  var abstractSampler = makeERP(abstractPs, groupSymbols);
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(abstractSymbol){
    var i = indexOf(abstractSymbol, groupSymbols);
    return groupERPs[i];
  }
  
  return [abstractSampler, getConcreteSampler];

}

///

// Original random variable

var testERP = makeERP([.1, .2, .3, .4], 
                      ["x1", "x2", "x3", "y1"]);

// Abstraction map for partitioning values

var abstractionMap = {
  "x1": "x",
  "x2": "x",
  "x3": "x",
  "y1": "y"
}

var coarsenValue = function(value){
  if (abstractionMap.hasOwnProperty(value)){
    return abstractionMap[value];
  } else {
    return value; // value is unchanged in abstract domain
  }
}

// Decomposed random variable

var tmp = coarsenERP(testERP, coarsenValue);
var coarseTestERP = tmp[0];
var getFineTestERP = tmp[1];

// Show coarsedistribution

print(coarseTestERP);

// Show marginal distribution of two-stage process

print(
  Enumerate(
    function(){
      var v1 = sample(coarseTestERP);
      var v2 = sample(getFineTestERP(v1));
      return v2
    }))
~~~~
