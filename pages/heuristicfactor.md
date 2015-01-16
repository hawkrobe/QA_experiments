---
layout: page
title: Heuristic factors
status: other
---

What if we can't decompose the factor into separate pieces? For instance in:

~~~
var binomial = function(){
  var a = sample(bernoulliERP, [0.1])
  var b = sample(bernoulliERP, [0.9])
  var c = sample(bernoulliERP, [0.1])
  factor( (a|b|c) ? 0:-10)
  return a + b + c
}

print(Enumerate(binomial, 2))
~~~

We can still insert 'heuristic' factors that will help the inference algorithm explore more usefully, as long as they cancel by the end. That is, `factor(s); factor(-s)` has no effect on the meaning of the model, and so is always allowed (even if the two factors are separated, as long as they aren't separated by a marginalization operator). For instance:

~~~
var binomial = function(){
  var a = sample(bernoulliERP, [0.1])
  factor(a?0:-1)
  var b = sample(bernoulliERP, [0.9])
  factor(  ((a|b)?0:-1) - (a?0:-1))
  var c = sample(bernoulliERP, [0.1])
  factor( ((a|b|c) ? 0:-10) - ((a|b)?0:-1))
  return a + b + c
}

print(Enumerate(binomial, 2))
~~~

This will work pretty much any time you have 'guesses' about what the final factor will be, while you are executing your program. Especially if these guesses improve incrementally and steadily. For examples of this technique, see the [incremental semantic parsing example](semanticparsing.html#incremental-world-building) and the [vision example](vision.html).
