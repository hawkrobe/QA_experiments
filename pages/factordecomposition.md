---
layout: page
title: Factor decomposition for dependent variables
status: other
---

Dependent random variable:

~~~~
///fold:
var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}
///


var X = makeERP([.1,.2,.3,.4], ["a", "b", "c", "d"]);
var Y = function(x){
  var ps = (x == "d") ? [.1, .9] : [.9, .1];
  return makeERP(ps, ["yes", "no"]);
}

var model = function(){
  var x = sample(X);
  var y = sample(Y(x));
  return y
}

print(Enumerate(model))
~~~~

Factor decomposition:

~~~~
///fold:
var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}
///


var X = makeERP([.1,.2,.3,.4], ["a", "b", "c", "d"]);
var Y = function(x){
  var ps = (x == "d") ? [.1, .9] : [.9, .1];
  return makeERP(ps, ["yes", "no"]);
}
var Yuniform = makeERP([.5, .5], ["yes", "no"]);

var model = function(){
  var x = sample(X);
  var y = sample(Yuniform);
  factor(Y(x).score([], y) - Yuniform.score([], y));
  return y;
}

print(Enumerate(model))
~~~~
