---
layout: page
title: Merging multiple variables (sketch)
status: current
---

Let's think about an example of coarsening multiple random variables into a single one:

~~~~
var model = function(){
  var x = sample(erp1);
  var y = sample(erp2);
  var z = f(x, y);
  var d = g(x);
  var e = h(y);  
}
~~~~

What does the coarsened model look like in this case?

As a first step, we merge the variables so that there is a single pair-valued variable:

~~~~
// primitives

var first = function(xs){
  return xs[0]
}

var second = function(xs){
  return xs[1]
}


var model = function(){
  var xy = [sample(erp1), sample(erp2)];
  var z = f(first(xy), second(xy));
  var d = g(first(xy));
  var e = h(second(xy));
}
~~~~

Note that this didn't change the model's distribution. We can now merge the two erps into a single one:

~~~~
///fold:
var first = function(xs){
  return xs[0]
}

var second = function(xs){
  return xs[1]
}
///

var erpProduct = function(thunk1, thunk2){
  return Enumerate(
    function(){
      var x = thunk1();
      var y = thunk2();
      return [x, y];
    });
};

var xyErp = erpProduct(
  function(){return sample(erp1)}, 
  function(){return sample(erp2)}}

var model = function(){
  var xy = sample(xyErp);
  var z = f(first(xy), second(xy));
  var d = g(first(xy));
  var e = h(second(xy));
}
~~~~

Then, in the next step, we coarsen `xyErp` as usual, and lift `first` and `second` to the abstract domain, also as usual.

~~~~
var coarseModel = function(){
  var xy = sample(coarseXyErp);
  var z = coarseF(coarseFirst(xy), coarseSecond(xy));
  var d = coarseG(coarseFirst(xy));
  var e = coarseH(coarseSecond(xy));
}
~~~~

The requirement for merging of multiple variables is that the first step is possible. This requires in turn that `x` and `y` are sampled "close enough" together. In particular, this is possible (and easy enough to automate) if `x` and `y` are defined and named within the same block.
