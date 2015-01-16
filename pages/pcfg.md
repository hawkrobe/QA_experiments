---
layout: page
title: PCFG
status: current
---

## Introduction

Overall, we need to work out the following issues:

- Coarsening multiple variables into a single variable
- Approximation/learning for coarsened primitives
- Automate the transform from a fine-grained model to a coarse-to-fine model
- Coarsening with conditionally existing variables
- Coarsening for nested-query models
- Learn good coarsenings
- Relation to Galois Connections
- Relation to existing coarse-to-fine NLP approaches
- Multi-stage coarsening

It's probably best to pick a specific application that covers multiple issues.

## PCFGs

Let's think about PCFGs, which I expect will cover the following issues:

- Automate the transform from a fine-grained model to a coarse-to-fine model
- Coarsening with conditionally existing variables
- Relation to existing coarse-to-fine NLP approaches
- (Multi-stage coarsening)

Let's first think about a PCFG where coarse-to-fine inference could help. We can construct a PCFG that is similar to the HMM example used in the previous writeup. The rules could look like this:

~~~~
var rules = {
  'S': {
    rhs: [['X'], ['Y']],
    probs: [.7, 0.3]
  },
  'X': {
    rhs: [['X1'], ['X2'], ['X3']],
    probs: [.33, .33, .33]
  },
  'X1': {
    rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
    probs: [.33, .33, .33]
  },
  'X2': {
    rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
    probs: [.33, .33, .33]
  },
  'X3': {
    rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
    probs: [.33, .33, .33]
  },
  'Y': {
    rhs: [['Y1'], ['Y', 'Y1']],
    probs: [.5, .5]
  },
  'Y1': {
    rhs: [['A'], ['B']],
    probs: [.1, .9]
  }
}
~~~~

The most probable sentences under this PCFG look like this:

~~~~
var transition = function(symbol){
///fold: rules
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
///
  return rules[symbol].rhs[discrete(rules[symbol].probs)];
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  // deterministic for now
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}

var expand = function(symbols, yieldsofar) {
  if (symbols.length==0) {
    return yieldsofar;
  } else {
    return expand(symbols.slice(1), pcfg(symbols[0], yieldsofar));
  }
}

var pcfg = function(symbol, yieldsofar) {
  if (preTerminal(symbol)){
    var t = terminal(symbol);
    return yieldsofar.concat([t]);
  } else {
    return expand(transition(symbol), yieldsofar) }
}

print(Enumerate(function(){return pcfg('S', [])}, 50))
~~~~

The principle is the same as for the HMM: There is a class of explanations (namely those involving `X` nonterminals) that we would like to rule out all at once if we have a sentence that involves a `b`.

Let's condition this PCFG and print out the partial program executions as they are enumerated:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}
///

var transition = function(symbol){
///fold: rules
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
///
  return rules[symbol].rhs[discrete(rules[symbol].probs)];
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  // deterministic for now
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}

var expand = function(symbols, yieldsofar, trueyield) { 
  printState(yieldsofar, symbols, trueyield);
  if (symbols.length==0) {
    return yieldsofar;
  } else {
    return expand(symbols.slice(1), 
                  pcfg(symbols[0], yieldsofar, trueyield), 
                  trueyield);
  }
}

var pcfg = function(symbol, yieldsofar, trueyield) {
  if (preTerminal(symbol)){
    var t = terminal(symbol);    
    if (yieldsofar.length < trueyield.length){
      factor(t==trueyield[yieldsofar.length] ?0:-Infinity)
    } else {
      null // required because if without else is broken in storepassing
    }
    return yieldsofar.concat([t])
  } else {
    return expand(transition(symbol), yieldsofar, trueyield) }
}

print(
  Enumerate(
    function(){
      var trueyield = ['a', 'a', 'b'];
      var out = pcfg('S', [], trueyield);
      factor(arrayEq(out, trueyield) ? 0 : -Infinity); 
      return out;
    }, 
    32))
~~~~

The correct parse is found after about 1000 expansion steps.

## Building a coarse-to-fine PCFG

How should this work?

- The different productions for `X` are very similar, so we'd like to merge them.

How would this work?

- `transition` is essentially a dependent ERP, so we would 
 1. turn it into an independent ERP using factor decomposition, then 
 2. coarsen the resulting independent ERP
- This coarsening would merge `X1`, `X2`, and `X3`

### Cleaning up the model

As a first step, I'll transform the model into a form that is closer to what we worked with last time. That means:

- Write transition function as a dependent ERP
- Separate deterministic primitives, erps, and compound model functions
- Write scoring functions for factors as primitives

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}
///


// ERPs

var transitionERP = function(symbol){
///fold: rules
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
///
  return makeERP(rules[symbol].probs, rules[symbol].rhs);
}


// Deterministic primitives

var arrayEqualScore = function(out, trueyield){
  return arrayEq(out, trueyield) ? 0 : -Infinity;
}

var equalScore = function(x, y){
  return x==y ? 0 : -Infinity;
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}


// Compound (model) functions

var expand = function(symbols, yieldsofar, trueyield) { 
  printState(yieldsofar, symbols, trueyield);
  if (symbols.length==0) {
    return yieldsofar;
  } else {
    return expand(symbols.slice(1), 
                  pcfg(symbols[0], yieldsofar, trueyield), 
                  trueyield);
  }
}

var pcfg = function(symbol, yieldsofar, trueyield) {
  if (preTerminal(symbol)){
    var t = terminal(symbol)
    if (yieldsofar.length < trueyield.length){
      factor(equalScore(t, trueyield[yieldsofar.length]));
    } else {
      null
    }
    return yieldsofar.concat([t])
  } else {
    var symbols = sample(transitionERP(symbol));
    return expand(symbols, yieldsofar, trueyield) 
  }
}

var model = function(){
  var trueyield = ['a', 'a', 'b'];
  var out = pcfg('S', [], trueyield);
  factor(arrayEqualScore(out, trueyield)); 
  return out;
}

print(Enumerate(model, 32))
~~~~

After some discussion of upcoming issues, we are going to apply the steps outlined in the previous coarse-to-fine document to this model.

### Problems ahead?

Are there going to be difficulties relating to conditionally existing variables? What about `if` statements? Can we think in more detail about the stage where all random variables are sampled independently on the abstract level (even if this is only an intermediate stage, and we do later use factors there as well)?

In the first step, we decompose the dependent transition ERP into an independent one (that has full support) and a factor (that adjusts the probabilities, killing of many productions). There are no problems here.

What if we used this model without factors (as we are roughly doing in the second step, when we make a coarse copy)? The model would substantially over-produce, allowing many derivations that are not valid. If we use this model with coarse factors, it might allow some derivations that are not valid (but not necessarily, if the abstractions are well-chosen), but most would be killed off. The ones that remain would be killed of on the fine-grained level.

In summary, there don't seem to be problems ahead.

### Matching up coarse-grained and fine-grained variables

Unlike in the (flattened) HMM discussion, we can no longer use variable names to match up coarse and fine dependent variables and factors. Instead, what I'd like to be able to do, is access the address at any point, and compute relative addresses. Let's explore this option.

~~~~
var relativizeAddress = function(address, baseAddress){
  print(baseAddress);
  var commonBase = baseAddress[0];
  return map(function(x){return x-commonBase}, address).slice(1);
}

var foo = function(){
  var baseAddress = getAddress()
  var g = function(){
    var x = getAddress();
    return x
  }
  return relativizeAddress(g(), baseAddress);
}

var bar = function(){
  var baseAddress = getAddress()
  var f = function(){
    var x = getAddress();
    return x;    
  }
  return relativizeAddress(f(), baseAddress);
}

print([foo(), bar()])
~~~~

Apparently, the difference in addresses isn't just a fixed offset. Next step: figure out what exactly it is.

Naming happens before CPS. We can look at the resulting code:

~~~~
// static

var foo = function (_k104, address) {
    var _return = _k104;
    (function (_s111) {
        getAddress(function (baseAddress) {
            var g = function (_k109, address) {
                var _return = _k109;
                (function (_s110) {
                    getAddress(function (x) {
                        _return(x);
                    }, _s110);
                }(address.concat('_25')));
            };
            (function (_s105) {
                (function (_s106) {
                    (function (_s108) {
                        g(function (_s107) {
                            relativizeAddress(_return, _s106, _s107, baseAddress);
                        }, _s108);
                    }(address.concat('_26')));
                }(address.concat('_27')));
            }(undefined));
        }, _s111);
    }(address.concat('_24')));
};

var bar = function (_k112, address) {
    var _return = _k112;
    (function (_s119) {
        getAddress(function (baseAddress) {
            var f = function (_k117, address) {
                var _return = _k117;
                (function (_s118) {
                    getAddress(function (x) {
                        _return(x);
                    }, _s118);
                }(address.concat('_29')));
            };
            (function (_s113) {
                (function (_s114) {
                    (function (_s116) {
                        f(function (_s115) {
                            relativizeAddress(_return, _s114, _s115, baseAddress);
                        }, _s116);
                    }(address.concat('_30')));
                }(address.concat('_31')));
            }(undefined));
        }, _s119);
    }(address.concat('_28')));
};

(function (_s120) {
    (function (_s125) {
        foo(function (_s122) {
            (function (_s124) {
                bar(function (_s123) {
                    (function (_s121) {
                        print(topK, _s120, _s121);
                    }([
                        _s122,
                        _s123
                    ]));
                }, _s124);
            }(address.concat('_33')));
        }, _s125);
    }(address.concat('_32')));
}(address.concat('_34')));
~~~~

The calls to `foo` and `bar` receive addresses that differ only by one (33, 34). However, the addresses used within `foo` and `bar` differ by `4`. We need to do two things:

1. Subtract the address they receive
2. Remove the remaining offset

Let's try this:

~~~~
var relativizeAddress = function(address, baseAddress){
  var relativized = map(function(x){return x-baseAddress[baseAddress.length-1]}, address);
  return relativized.slice(1);
}

var foo = function(){
  var baseAddress = getAddress()
  var g = function(){
    var x = getAddress();
    return x
  }
  var g2 = function(){
    var y = g();
    return y
  }
  return relativizeAddress(g2(), baseAddress);
}

var bar = function(){
  var baseAddress = getAddress()
  var f = function(){
    var x = getAddress();
    return x;    
  }
  var f2 = function(){
    var w = f();
    return w;
  }
  return relativizeAddress(f2(), baseAddress);
}

print([foo(), bar()])
~~~~

Ok, looks good.

The remainder of the document will describe the following steps:

- Apply factor decomposition to dependent ERPs
- Make a copy of the model that first samples all variables coarsely (without factors), then dependent fine-grained factors. This entails:
 - Splitting each random variable into a coarse and (dependent) fine variable
 - Accessing the corresponding coarse value (probably using global state - and addresses?)
- Lift functions and add coarse-grained factors

### Decomposing dependent ERPs

There is only one ERP in this model: the transition ERP. In the following, we are going to replace it with a uniform transition ERP and a factor that corrects the score.

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}
///


// ERPs

// makeUniformTransitionERP is a function so that everything that
// follows is still on top-level, where mutual recursion
// works (which is necessary for pcfg and expand)  
var makeUniformTransitionERP = function(){
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
///fold: rules
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
///
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
  // TODO: check that this actually works
}


// Deterministic primitives

var arrayEqualScore = function(xs, ys){
  return arrayEq(xs, ys) ? 0 : -Infinity;
}

var equalScore = function(x, y){
  return x==y ? 0 : -Infinity;
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}


// Compound (model) functions
  
var expand = function(symbols, yieldsofar, trueyield, env) { 
  // printState(yieldsofar, symbols, trueyield);
  if (symbols.length==0) {
    return yieldsofar;
  } else {
    return expand(symbols.slice(1), 
                  pcfg(symbols[0], yieldsofar, trueyield, env), 
                  trueyield, 
                  env);
  }
}

var pcfg = function(symbol, yieldsofar, trueyield, env) {
  if (preTerminal(symbol)){
    var t = terminal(symbol)
    if (yieldsofar.length < trueyield.length){
      factor(equalScore(t, trueyield[yieldsofar.length]));
    } else { null }
    return yieldsofar.concat([t])
  } else {
    var symbols = sample(env.uniformTransitionERP);
    var uScore = env.uniformTransitionERP.score([], symbols);
    var tScore = transitionScore(symbol, symbols);
    factor(tScore - uScore);
    return expand(symbols, yieldsofar, trueyield, env);
  };
}

var model = function(){
  var env = {
    uniformTransitionERP : makeUniformTransitionERP()
  };
  var trueyield = ['a', 'a', 'b'];
  var out = pcfg('S', [], trueyield, env);
  factor(arrayEqualScore(out, trueyield)); 
  return out;
}

print(Enumerate(model, 70))
~~~~

The distribution is the same, but we had to enumerate a lot longer due to splitting up the dependent ERP into an independent ERP (with broad support) and a factor (that narrows the support).

### Splitting the model into coarse and fine

This covers two steps in the old writeup:

- Decomposing random variables
- Lifting deterministic functions and factors

The reason for merging these two steps is that, for structurally more complex models, we can't just split the variables directly, as they get created at runtime. This means that we need to split the entire model, which requires that we deal with deterministic functions and factors.

Before we do this for the PCFG, let's split a simpler model using addresses.

### Interlude: Splitting a simpler model

Let's think about coarsening the following simple model that has just a single random variable:

~~~~
///fold:
var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}
///

var erp = makeERP([.1,.3,.6], ["a", "b", "c"]);

var model = function(){
  var f = function(){
    return sample(erp);
  }
  return f();
}

print(Enumerate(model))
~~~~

There are no dependent erps, so we don't need to decompose them. There are also no primitive functions or factors, so all we need to do is split the erp into coarse and fine, now using addressing to identify coarse and fine erp.

~~~~
///fold:
var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}
///

var erp = makeERP([.1,.3,.6], ["a", "b", "c"]);

var model = function(){
  var f = function(){
    return sample(erp);
  }
  return f();
}

print(Enumerate(model))
~~~~

We are going to store erp information in the global store based on addresses as follows:

~~~~
var name = "erp_" + getAddress().join();
globalStore[name] = "this is a test";
print(name);
print(globalStore[name]);
~~~~

The new coarse-to-fine model is going to look like this:

~~~~
///fold:
var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var getRelativeAddress = function(baseAddress){
  var address = getAddress();
  var relativized = map(function(x){return x-baseAddress[baseAddress.length-1]}, address);
  return relativized.slice(2, -1); // <- FIXME
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}
///

var testERP = makeERP([.1,.3,.6], ["a", "b", "c"]);

var abstractionMap = {
  "a": "x",
  "b": "x",
  "c": "y",
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
var getCoarseTestERP = tmp[0];
var getFineTestERP = tmp[1];

var coarseModel = function(){
  var baseAddress = getAddress();
  var f = function(){
    return getCoarseTestERP(getRelativeAddress(baseAddress))();
  }
  return f();
}

var fineModel = function(){
  var baseAddress = getAddress();
  var f = function(){
    return getFineTestERP(getRelativeAddress(baseAddress))();
  }
  return f();    
}

var model = function(){
  coarseModel();
  return fineModel();
}

print(Enumerate(model))
~~~~

This worked, but we had to mangle the relative address.

Next steps:

- Make relative addresses more reliable (understand how to select the correct subset)
- Simplify code
- Apply to PCFG
- Automation

### Reliable relative addresses

The following `getRelativeAddress` function is more principled than the slicing above:

~~~~
var noop = function(){
  return null;
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

// foo, bar, and baz have the same structure 
// (but are defined in syntactically different places)

var foo = function(){
  var baseAddress = getAddress();
  var sub = function(){
    noop();
    noop();
    var subsub = function(){
      print({
        program: 'foo',
        base: baseAddress,
        addr: getAddress(),
        relativized: getRelativeAddress(baseAddress)
      });
    }
    subsub();
  }
  sub();  
}

var bar = function(){
  var baseAddress = getAddress();
  var sub = function(){
    noop();
    noop();
    var subsub = function(){
      print({
        program: 'bar',
        base: baseAddress,
        addr: getAddress(),
        relativized: getRelativeAddress(baseAddress)
      });
    }
    subsub();
  }
  sub();  
}

var baz = function(){
  var baseAddress = getAddress();
  var sub = function(){
    noop();
    noop();
    var subsub = function(){
      print({
        program: 'baz',
        base: baseAddress,
        addr: getAddress(),
        relativized: getRelativeAddress(baseAddress)
      });
    }
    subsub();
  }
  sub();  
}

// The calls to foo, bar, and baz occur in
// structurally different locations.

var main = function(){
  var sub1 = function(){
    noop();
    foo();
  }  
  noop();
  var sub2 = function(){
    var subsub1 = function(){
      bar();
    }
    noop();
    subsub1();
  }
  noop();
  noop();
  var sub3 = function(){
    var subsub3 = function(){
      noop();
      var subsubsub3 = function(){
        baz();
      }
      subsubsub3();
    }
    subsub3();
  }  
  sub1();
  noop();
  sub2();
  noop();
  noop();
  noop();
  sub3();
}

main()
~~~~

The relativized addresses are the same, even though the calls appear in very different places and even though the code for the three functions `foo`, `bar`, and `baz` is distinct.

### The simple coarse-to-fine model, revisited

Let's now write the simple coarse-to-fine model above using the new `getRelativeAddress` function in order to verify that it does the same thing.

~~~~
///fold:
var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}
///

var testERP = makeERP([.1,.3,.6], ["a", "b", "c"]);

var abstractionMap = {
  "a": "x",
  "b": "x",
  "c": "y",
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
var getCoarseTestERP = tmp[0];
var getFineTestERP = tmp[1];

var coarseModel = function(){
  var baseAddress = getAddress();
  var f = function(){
    return getCoarseTestERP(getRelativeAddress(baseAddress))();
  }
  return f();
}

var fineModel = function(){
  var baseAddress = getAddress();
  var f = function(){
    return getFineTestERP(getRelativeAddress(baseAddress))();
  }
  return f();    
}

var model = function(){
  coarseModel();
  return fineModel();
}

print(Enumerate(model))
~~~~

Yep, it does the same thing.

## Coarse-to-fine PCFG

### Abstraction and refinement for the PCFG

Let's first define the abstraction and refinement functions that we are going to use. To do this, we need to know to which kinds of values our abstraction function is going to apply to. It is used on the outputs of primitive functions, and for coarsening ERP return values. One of these primitive functions is `arrayEqualScore`, which applies to sequences of symbols, so our abstraction and refinement functions need to apply to sequences as well.

Refinement creates a list of values that map to an abstract value.

~~~~
var symbols = ['S', 'X', 'Y', 'X1', 'X2', 'X3', 'A', 'B', 'Y1', 'Y'];

var testValues = symbols.concat([
  ['X', 'Y'],
  ['X1', 'X2', 'A', 'Y1'],
  ['S'],
  ['A', 'B'],
  ['X2', 'Y', 'X3'],
  11.234,
  10,
  "foobar"
]);

var valueAbstractionMap = {
  'X': 'X',
  'Y': 'Y',
  'X1': 'cX',
  'X2': 'cX',
  'X3': 'cX',
  'A': 'A',
  'B': 'B',
  'Y1': 'Y1'
}

var valueRefinementMap = invertMap(valueAbstractionMap);

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap.hasOwnProperty(value)){
      return valueAbstractionMap[value];
    } else {
      return value;
    }
  }
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap.hasOwnProperty(abstractValue)){
      return valueRefinementMap[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}

print("----- abstraction:")
map(compose(print, coarsenValue), testValues)

print("----- refinement:")
map(compose(print, compose(refineValue, coarsenValue)), testValues)
print("done")
~~~~

### Coarse-to-fine PCFG

Now we have to do the following:

1. Acquire base address at the beginning of the model, pass it around
2. Make a copy of the model; rename everything in the first copy coarseX and everything in the second copy fineX; write a model function that first calls the coarse model, then the fine model.
3. Lift primitive functions
4. Build coarse/fine erps

Let's build the pieces one by one.

Abstraction and refinement:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};
///


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}

print(coarsenValue('X'))
print(coarsenValue('X1'))
print(coarsenValue('B'))
print(coarsenValue(['X', 'X1', 'B']))

print(refineValue('X'))
print(refineValue('cX'))
print(refineValue('B'))
print(refineValue(['X', 'cX', 'B']))
~~~~

ERPs:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}
///


// =====================================================================
// ERPs

var makeUniformTransitionERP = function(){
  // FIXME: inefficient - turn into value, not thunk
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
///fold: rules
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
///
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
}

var uniformTransitionERP = makeUniformTransitionERP();

print(uniformTransitionERP)
print(Math.exp(transitionScore('S', ['X'])))
print(Math.exp(transitionScore('S', 'asdfadsf')))
print(Math.exp(transitionScore('X3', ['X3', 'X3'])))
~~~~

Coarsened ERPs:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log("global store:", globalStore);
    console.log("looking up name:", name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}

// =====================================================================
// ERPs

var makeUniformTransitionERP = function(){
  // FIXME: inefficient - turn into value, not thunk
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
}

///


var uniformTransitionERP = makeUniformTransitionERP();

var tmp = coarsenERP(uniformTransitionERP, coarsenValue);
var getAbstractSampler = tmp[0];
var getConcreteSampler = tmp[1];

var foo = function(){
  var baseAddress = getAddress();
  var sampler = getAbstractSampler(getRelativeAddress(baseAddress));
  // print(sampler());
  return sampler()
}

var bar = function(){
  var baseAddress = getAddress();
  var sampler = getConcreteSampler(getRelativeAddress(baseAddress));
  // print(sampler());
  return sampler()
}

var model = function(){
  foo();
  console.log("intermediate global store:", globalStore);
  return bar();
}

print(Enumerate(model))
~~~~

Deterministic primitives:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}



// =====================================================================
// ERPs

var makeUniformTransitionERP = function(){
  // FIXME: inefficient - turn into value, not thunk
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
}

///


// =====================================================================
// Deterministic primitives

// - Fine

var arrayEqualScore = function(xs, ys){
  return arrayEq(xs, ys) ? 0 : -Infinity;
}

var equalScore = function(x, y){
  return x==y ? 0 : -Infinity;
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}

print(arrayEqualScore(['X', 'Y'], ['X', 'Y']));
print(arrayEqualScore(['X', 'Y'], ['X', 'Z']).toString());
print(equalScore('X', 'X'));
print(equalScore('X', 'Y').toString());
print(preTerminal('X'));
print(preTerminal('A'));
print(terminal('A'));
print(terminal('B'));
~~~~

Lifted deterministic primitives:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}



// =====================================================================
// ERPs

var makeUniformTransitionERP = function(){
  // FIXME: inefficient - turn into value, not thunk
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
}



// =====================================================================
// Deterministic primitives

// - Fine

var arrayEqualScore = function(xs, ys){
  return arrayEq(xs, ys) ? 0 : -Infinity;
}

var equalScore = function(x, y){
  return x==y ? 0 : -Infinity;
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}
///

// - Coarse

var coarseArrayEqualScore = lift2(arrayEqualScore, coarsenValue, refineValue, true);
var coarseEqualScore = lift2(equalScore, coarsenValue, refineValue, true);
var coarsePreTerminal = lift1(preTerminal, coarsenValue, refineValue, false);
var coarseTerminal = lift1(terminal, coarsenValue, refineValue, false);

print(Math.exp(coarseArrayEqualScore(['cX', 'cX'], ['cX', 'cX'])));
print(Math.exp(coarseArrayEqualScore(['S'], ['S'])));
print(Math.exp(coarseEqualScore('cX', 'cX')));
print(Math.exp(equalScore('S', 'S')));
print(Math.exp(coarseEqualScore('S', 'S')));

print(coarsePreTerminal('S'));
print(coarsePreTerminal('A'));
print(coarseTerminal('A'));
~~~~

Coarse model, simplified version:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}



// =====================================================================
// ERPs

var makeUniformTransitionERP = function(){
  // FIXME: inefficient - turn into value, not thunk
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
}



// =====================================================================
// Deterministic primitives

// - Fine

var arrayEqualScore = function(xs, ys){
  return arrayEq(xs, ys) ? 0 : -Infinity;
}

var equalScore = function(x, y){
  return x==y ? 0 : -Infinity;
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}

// - Coarse (lifted)

var coarseArrayEqualScore = lift2(arrayEqualScore, coarsenValue, refineValue, true);
var coarseEqualScore = lift2(equalScore, coarsenValue, refineValue, true);
var coarsePreTerminal = lift1(preTerminal, coarsenValue, refineValue, false);
var coarseTerminal = lift1(terminal, coarsenValue, refineValue, false);

///

var uniformTransitionERP = makeUniformTransitionERP();

var tmp = coarsenERP(uniformTransitionERP, coarsenValue);

var globalEnv = {
  getCoarseUniformTransitionERP: tmp[0],
  getFineUniformTransitionERP: tmp[1]
};

var model = function(){
  var baseAddress = getAddress();
  var env = {
    getCoarseUniformTransitionERP : globalEnv.getCoarseUniformTransitionERP,
    baseAddress: baseAddress
  };
  var getThunk = env.getCoarseUniformTransitionERP;
  var thunk = getThunk(getRelativeAddress(env.baseAddress));
  print(Enumerate(thunk))
}

model()
~~~~

Coarse model:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
      console.log("setting global store to:", globalStore);      
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
    console.log(globalStore);
    console.log(name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}



// =====================================================================
// ERPs

var makeUniformTransitionERP = function(){
  // FIXME: inefficient - turn into value, not thunk
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}



// =====================================================================
// Deterministic primitives

// - Fine

var arrayEqualScore = function(xs, ys){
  return arrayEq(xs, ys) ? 0 : -Infinity;
}

var equalScore = function(x, y){
  return x==y ? 0 : -Infinity;
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
}

// - Coarse (lifted)

var coarseArrayEqualScore = function(x, y){
  // FIXME
  var f = lift2(arrayEqualScore, coarsenValue, refineValue, true);
  return f(x, y);
}
var coarseEqualScore = function(x, y){
  // FIXME  
  var f = lift2(equalScore, coarsenValue, refineValue, true);
  return f(x, y);
}
var coarsePreTerminal = function(x){
  // FIXME
  var f = lift1(preTerminal, coarsenValue, refineValue, false);
  return f(x);
}
var coarseTerminal = function(x){
  // FIXME
  var f = lift1(terminal, coarsenValue, refineValue, false);
  return f(x);
}
var coarseTransitionScore = function(x, y){
  // FIXME
  var f = lift2(transitionScore, coarsenValue, refineValue, true);
  return f(x, y);
}

///


// =====================================================================
// Compound (model) functions
  

// ---------------------------------------------------------------------
// Coarse model

var coarseExpand = function(symbols, yieldsofar, trueyield, env) { 
  // printState(yieldsofar, symbols, trueyield);
  if (symbols.length==0) {
    return yieldsofar;
  } else {
    return coarseExpand(symbols.slice(1), 
                        coarsePcfg(symbols[0], yieldsofar, trueyield, env), 
                        trueyield, 
                        env);
  }
}

var coarsePcfg = function(symbol, yieldsofar, trueyield, env) {
  if (coarsePreTerminal(symbol)){
    var t = coarseTerminal(symbol)
    if (yieldsofar.length < trueyield.length){
      factor(coarseEqualScore(t, trueyield[yieldsofar.length]));
    } else { null }
    return yieldsofar.concat([t])
  } else {
    var getThunk = env.getCoarseUniformTransitionERP;
    var thunk = getThunk(getRelativeAddress(env.baseAddress));
    var erp = Enumerate(thunk);
    var symbols = thunk();
    var uScore = erp.score([], symbols);
    var tScore = coarseTransitionScore(symbol, symbols);
    factor(tScore - uScore);
    return coarseExpand(symbols, yieldsofar, trueyield, env);
  };
}

var coarseModel = function(globalEnv){
  var baseAddress = getAddress();
  var env = {
    getCoarseUniformTransitionERP : globalEnv.getCoarseUniformTransitionERP,
    baseAddress: baseAddress
  };
  var trueyield = ['a', 'a', 'b'];
  var out = coarsePcfg('S', [], trueyield, env);
  factor(coarseArrayEqualScore(out, trueyield)); 
  return out;
}

print(Enumerate(function(){
  var uniformTransitionERP = makeUniformTransitionERP();
  var tmp = coarsenERP(uniformTransitionERP, coarsenValue);
  var globalEnv = {
    getCoarseUniformTransitionERP: tmp[0],
    getFineUniformTransitionERP: tmp[1]
  };  
  var out = coarseModel(globalEnv);
  console.log("intermediate global store:", globalStore);
  return out;
}, 15));
~~~~

The full coarse-to-fine model requires that we also store coarse factors and subtract them out on the fine level. We introduce `coarseFactor` and `fineFactor` helper functions for this task. These use relative erp addresses just like the factored erps do.

Full coarse-to-fine model:

~~~~
///fold:
var printState = function(yieldsofar, symbols, trueyield){
  if (arrayEq(yieldsofar, trueyield) & (symbols.length == 0)){
    print([yieldsofar, symbols, '********************************']);
  } else {
    print([yieldsofar, symbols]);
  } 
}

var flatten = function(xs){
  if (xs.length == 0) {
    return []
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
}

var productOfLists = function(xs){
  if (xs.length == 0) {
    return [[]];
  } else {
    var xrs = productOfLists(xs.slice(1));    
    return flatten(map(
      function(x0){
        map(function(l){return [x0].concat(l)}, xrs);
      },
      xs[0]));
  }
}

var arrayEq = function(a, b){
  return a.length == 0 ? (b.length == 0) : a[0]==b[0] & arrayEq(a.slice(1), b.slice(1))
}

var makeERP = function(ps, vs){
  return Enumerate(function(){return vs[discrete(ps)]});
}

var removeCommonPrefix = function(xs, ys){
  if ((xs.length == 0) | (ys.length == 0)) {
    return [xs, ys];
  } else if (xs[0] === ys[0]){
    return removeCommonPrefix(xs.slice(1), ys.slice(1));
  } else {
    return [xs, ys];
  }
}

var getRelativeAddress = function(baseAddress){
  // 1. Get address
  var a = getAddress();
  // 2. Remove last element (since last element
  // just points to the getAddress call here, not the
  // surrounding context that we care about)  
  var addr = a.slice(0, a.length - 1);
  // 3. Remove common prefix with base address (since prefix
  // reflects context that we want to ignore)
  var tmp = removeCommonPrefix(baseAddress, addr);
  if (tmp[0].length != 1){
    console.error("getRelativeAddress failed");
    console.log(baseAddress);    
    console.log(addr);
    return undefined;
  } else {
    var base0 = tmp[0][0];    
    // 4. Subtract last element of base address (to normalize
    // absolute value of addresses that happen in different
    // syntactic places)
    var relativized = map(
      function(x){return x-base0}, 
      tmp[1]);
    return relativized
  }
}

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
  var getAbstractSampler = function(relAddress){
    return function(){
      var x = sample(abstractSampler);
      var name = "erp_" + relAddress.join();
      globalStore[name] = x;
//       console.log("setting global store to:", globalStore);
      return x;
    }
  }
  
  var groupERPs = map2(makeERP, groupedPs, groupedVs);    
  var getConcreteSampler = function(relAddress){
    var name = "erp_" + relAddress.join();    
//     console.log("global store:", globalStore);
//     console.log("looking up name:", name);
    var abstractSymbol = globalStore[name];
    console.log("looked up abstract symbol: " + abstractSymbol);
    return function(){
      var i = indexOf(abstractSymbol, groupSymbols);
      var fineErp = groupERPs[i];
      var x = sample(fineErp);
      return x;
    }
  }
  
  return [getAbstractSampler, getConcreteSampler];

}

var logMeanExp = function(erp){
  return Math.log(expectation(erp, function(x){return Math.exp(x);}));
}

var lift1 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg){
    var fineArgs = refineValue(coarseArg);    
    return Enumerate(
      function(){
        var fineArg = fineArgs[randomInteger(fineArgs.length)];
        var fineOut = f(fineArg);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg){
    var outputSampler = getOutputSampler(coarseArg);
    return samplerToValue(outputSampler);
  };  

};

var lift2 = function(f, coarsenValue, refineValue, useMean){    

  var getOutputSampler = cache(function(coarseArg1, coarseArg2){
    var fineArgs1 = refineValue(coarseArg1);    
    var fineArgs2 = refineValue(coarseArg2);        
    return Enumerate(
      function(){
        var fineArg1 = fineArgs1[randomInteger(fineArgs1.length)];
        var fineArg2 = fineArgs2[randomInteger(fineArgs2.length)];        
        var fineOut = f(fineArg1, fineArg2);
        var coarseOut = coarsenValue(fineOut);
        return coarseOut;
      });    
  });

  var samplerToValue = useMean ? logMeanExp : sample;
  
  return function(coarseArg1, coarseArg2){
    var outputSampler = getOutputSampler(coarseArg1, coarseArg2);
    return samplerToValue(outputSampler);
  };  

};
///


// =====================================================================
// Factors

var coarseFactor = function(score, relativeAddress){
  var name = "factor_" + relativeAddress.join();  
  globalStore[name] = score;
  factor(score);
}

var fineFactor = function(score, relativeAddress){
  var name = "factor_" + relativeAddress.join();  
  var coarseScore = globalStore[name];
  console.log("fine factor: ", score, " - ", coarseScore);
  factor(score - coarseScore);           
}


// =====================================================================
// Abstraction

var valueAbstractionMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return {
    'X': 'X',
    'Y': 'Y',
    'X1': 'cX',
    'X2': 'cX',
    'X3': 'cX',
    'A': 'A',
    'B': 'B',
    'Y1': 'Y1'
  }
};

var valueRefinementMap = function(){
  // FIXME: inefficient - turn into value, not thunk
  return invertMap(valueAbstractionMap());
};

var coarsenValue = function(value){
  if (value instanceof Array) {
    return map(coarsenValue, value);
  } else {
    if (valueAbstractionMap().hasOwnProperty(value)){
      return valueAbstractionMap()[value];
    } else {
      return value;
    }
  }
}

var refineValue = function(abstractValue){
  if (abstractValue instanceof Array) {
    return productOfLists(map(refineValue, abstractValue));
  } else {
    if (valueRefinementMap().hasOwnProperty(abstractValue)){
      return valueRefinementMap()[abstractValue];
    } else {
      return [abstractValue];
    }
  }
}



// =====================================================================
// ERPs

var makeUniformTransitionERP = function(){
  // FIXME: inefficient - turn into value, not thunk
  var symbols = ['S', 'X', 'X1', 'X2', 'X3', 'Y', 'Y1'];  
  return Enumerate(
    function(){
      var symbol = symbols[randomInteger(symbols.length)];
      var erp = transitionERP(symbol);
      return sample(erp);
    });
}

var transitionERP = function(symbol){
///fold: rules
  var rules = {
    'S': {
      rhs: [['X'], ['Y']],
      probs: [.7, 0.3]
    },
    'X': {
      rhs: [['X1'], ['X2'], ['X3']],
      probs: [.33, .33, .33]
    },
    'X1': {
      rhs: [['X1', 'X1'], ['A', 'X1'], ['A']],
      probs: [.33, .33, .33]
    },
    'X2': {
      rhs: [['X2', 'X2'], ['A', 'X2'], ['A']],
      probs: [.33, .33, .33]
    },
    'X3': {
      rhs: [['X3', 'X3'], ['A', 'X3'], ['A']],
      probs: [.33, .33, .33]
    },
    'Y': {
      rhs: [['Y1'], ['Y', 'Y1']],
      probs: [.5, .5]
    },
    'Y1': {
      rhs: [['A'], ['B']],
      probs: [.1, .9]
    }
  };
///
 return makeERP(rules[symbol].probs, rules[symbol].rhs);
}

var transitionScore = function(symbol, rhs){
  var erp = transitionERP(symbol);
  return erp.score([], rhs);
}



// =====================================================================
// Deterministic primitives

// - Fine

var arrayEqualScore = function(xs, ys){
  return arrayEq(xs, ys) ? 0 : -Infinity;
}

var equalScore = function(x, y){
  return x==y ? 0 : -Infinity;
}

var preTerminal = function(symbol){
  return symbol=='A' | symbol=='B';
}

var terminal = function(symbol){
  return {
    'A' : 'a',
    'B' : 'b'
  }[symbol];
}

// - Coarse (lifted)

var coarseArrayEqualScore = function(x, y){
  // FIXME
  var f = lift2(arrayEqualScore, coarsenValue, refineValue, true);
  return f(x, y);
}
var coarseEqualScore = function(x, y){
  // FIXME  
  var f = lift2(equalScore, coarsenValue, refineValue, true);
  return f(x, y);
}
var coarsePreTerminal = function(x){
  // FIXME
  var f = lift1(preTerminal, coarsenValue, refineValue, false);
  return f(x);
}
var coarseTerminal = function(x){
  // FIXME
  var f = lift1(terminal, coarsenValue, refineValue, false);
  return f(x);
}
var coarseTransitionScore = function(x, y){
  // FIXME
  var f = lift2(transitionScore, coarsenValue, refineValue, true);
  return f(x, y);
}


// =====================================================================
// Compound (model) functions
  

// ---------------------------------------------------------------------
// Coarse model

var coarseExpand = function(symbols, yieldsofar, trueyield, env) { 
  printState(yieldsofar, symbols, trueyield);
  if (symbols.length==0) {
    return yieldsofar;
  } else {
    return coarseExpand(symbols.slice(1), 
                        coarsePcfg(symbols[0], yieldsofar, trueyield, env), 
                        trueyield, 
                        env);
  }
}

var coarsePcfg = function(symbol, yieldsofar, trueyield, env) {
  if (coarsePreTerminal(symbol)){
    var t = coarseTerminal(symbol)
    if (yieldsofar.length < trueyield.length){
      coarseFactor(
        coarseEqualScore(t, trueyield[yieldsofar.length]),
        getRelativeAddress(env.baseAddress));
    } else { null }
    return yieldsofar.concat([t])
  } else {
    var getThunk = env.getCoarseUniformTransitionERP; // sampler...
    var thunk = getThunk(getRelativeAddress(env.baseAddress));
    var erp = Enumerate(thunk);
    var symbols = thunk();
    var uScore = erp.score([], symbols);
    var tScore = coarseTransitionScore(symbol, symbols);
    coarseFactor(
      tScore - uScore,
      getRelativeAddress(env.baseAddress));
    return coarseExpand(symbols, yieldsofar, trueyield, env);
  };
}

var coarseModel = function(globalEnv){
  var baseAddress = getAddress();
  var env = {
    getCoarseUniformTransitionERP : globalEnv.getCoarseUniformTransitionERP,
    baseAddress: baseAddress
  };
  var trueyield = ['a', 'a', 'b'];
  var out = coarsePcfg('S', [], trueyield, env);
  coarseFactor(
    coarseArrayEqualScore(out, trueyield),
    getRelativeAddress(env.baseAddress)); 
  return out;
}


// ---------------------------------------------------------------------
// Fine model

var expand = function(symbols, yieldsofar, trueyield, env) { 
  printState(yieldsofar, symbols, trueyield);
  if (symbols.length==0) {
    return yieldsofar;
  } else {
    return expand(symbols.slice(1), 
                  pcfg(symbols[0], yieldsofar, trueyield, env), 
                  trueyield, 
                  env);
  }
}

var pcfg = function(symbol, yieldsofar, trueyield, env) {  
  if (preTerminal(symbol)){
    var t = terminal(symbol)
    if (yieldsofar.length < trueyield.length){
      fineFactor(
        equalScore(t, trueyield[yieldsofar.length]),
        getRelativeAddress(env.baseAddress));
    } else { null }
    return yieldsofar.concat([t])
  } else {
    var getThunk = env.getFineUniformTransitionERP; // sampler...
    var thunk = getThunk(getRelativeAddress(env.baseAddress));
    var erp = Enumerate(thunk);
    var symbols = thunk();
    var uScore = erp.score([], symbols);
    var tScore = transitionScore(symbol, symbols);
    fineFactor(
      tScore - uScore,
      getRelativeAddress(env.baseAddress));
    return expand(symbols, yieldsofar, trueyield, env);
  };
}

var fineModel = function(globalEnv){
  var baseAddress = getAddress();
  var env = {
    getFineUniformTransitionERP : globalEnv.getFineUniformTransitionERP,
    baseAddress: baseAddress
  };
  var trueyield = ['a', 'a', 'b'];
  var out = pcfg('S', [], trueyield, env);
  fineFactor(
    arrayEqualScore(out, trueyield),
    getRelativeAddress(env.baseAddress)); 
  return out;
}


// ---------------------------------------------------------------------
// Coarse-to-fine model

var model = function(){
  
  var uniformTransitionERP = makeUniformTransitionERP();
  var tmp = coarsenERP(uniformTransitionERP, coarsenValue);
  var globalEnv = {
    getCoarseUniformTransitionERP: tmp[0],
    getFineUniformTransitionERP: tmp[1]
  };
  
  var out = coarseModel(globalEnv);
  return fineModel(globalEnv);
}

print(Enumerate(model, 1))
~~~~

The correct parse is found after about 420 (coarse and fine) expansion steps, compared to 1000 expansion steps previously.

However, for some reason, the search started taking a lot longer once I added in the subtraction of coarse factors on the fine level.

Next steps:

- Speed up computation
- Understand why many executions are explored before first path is returned
- Automate transform
- Understand in more depth how exactly ctf inference helps in this setting
- Understand relation to existing coarse-to-fine work for PCFGs
