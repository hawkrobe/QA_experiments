In this document, we formulate Van Rooy's (2003) decision theoretic model of question and answer behavior in WebPPL and proceed to extend it in several ways. The basic setup requires a questioner facing a decision problem and an answerer who has information that might help the questioner resolve their problem. A decision problem is a function mapping actions and world states to utilities. 

For a basic example, suppose that Mary is the manager at a widget factory, and is allowed to press one of three buttons. One shuts the conveyer belt down, one speeds it up, and one sets it at an intermediate speed. In addition, the workers at the factory can be in one of three states: tired, regular, or motivated. If Mary stops the conveyer belt for regular or motivated workers, the factory suffers loses in productivity. If she stops the belt for tired workers, though, there's no loss since the workers weren't going to do a good job anyway. Similar stories can be given for the other two worker mental states. Numerical payoffs can be assigned for each action-world pair. This yields a fully specified decision problem.

Given no information about which worlds are most likely, we can calculate the expected utility of the decision problem for each action:

E_w[dp(a,w)] = \sum_w .33 * dp(a, w)

To get the value of the decision problem, von Rooy uses the expected utility for the action that maximizes this function -- a 'hard max' rule. Alternatively, we could use a 'soft max' rule, which simply weights the term for each possible action-world pair by its corresponding payoff and takes the expected value. We've implemented this decision problem below:

~~~~
var actionSpace = [0,1,2]
var worldSpace  = [0,1,2]

// dp is a function from actions and world states to real numbers
var dp = function (a, w) {
  var utils = [[0,-1,4], [-2,3,2], [-2,4,5]];
  return utils[w][a]
}

var actionPrior = function() {
  var i = randomInteger(actionSpace.length);
  return actionSpace[i]
}

var worldPrior = function() {
  var i = randomInteger(worldSpace.length)
  return worldSpace[i]
}

var valDP_softMax = function(dp) {
  expectation(Enumerate(function(){
    var w = worldPrior()
    var a = actionPrior()
    factor(dp(a,w));
    return a
//    return dp(a,w);
  }), function(v) {return v})
}

var valDP_hardMax = function(dp) {
  var res = maxWith(function(a){
    expectation(Enumerate(function(){
      var w = worldPrior()
      return dp(a, w);
    }), function(v) {return v})
  },
                    actionSpace);
  return res[1];
}

print(valDP_softMax(dp))
~~~~

Let's assume that there's a questioner facing a decision problem and an answerer with information that can resolve this decision problem. In a popular model of question/answer behavior, questions form a partition on the space of possible worlds, and answers select one or more cells from that partition. There is some shared prior over what world might actually be the case (e.g. it might be more likely that someone has a dalmatian than a Persian cat), captured by `worldPrior()`. 

The expected utility calculated above assumes that Mary has no information about which world is the case. If she was able to ask a worker on the floor how people were feeling, she could tailor her actions to fit this world. For example, even though stopping the conveyer is a bad action overall, it's actually the best action if she finds out that the workers are tired.   

We first model a literal answerer who hears a polar question of the type "do the workers have mental state *x*?" and for each world, returns either 'yes' or 'no' based on whether the proposition is true of the world. By reasoning about this answerer, the questioner can decide which question would lead to the highest gain in utility. To compare against the baseline, we retain the above state of ignorance as the utility after a 'null' utterance -- the expected utility of not asking any questions.
We will work with a simplified domain in which the state of the world consists of two buttons that have different colors and different functions, but the questioner doesn't know which button is which. 

~~~~
var valDP_softMax = function(utt, dp) {
  Enumerate(function(){
    var w = utt == "null" ? worldPrior() : literalListener(utt);
    var a = actionPrior()
    factor(dp(a,w));
    return dp(a,w);
  })
}

var valDP_hardMax = function(utt, dp) {
  var res = maxWith(function(a){
    expectation(Enumerate(function(){
      var w = utt == "null" ? worldPrior() : literalListener(utt);
      return dp(a, w);
    }), function(v) {return v})
  },
                    actionSpace);
  return res[1];
}
~~~~

~~~~
// rudimentary lookup table describing the literal semantics of appropriate questions...
// first component is the set of possible answers that resolve the question
// second component is the set of answers that don't (although there may be implicatures...)

var answerSpace = {"animal"   : [["animal", "dog", "dalmatian", "poodle", "cat", "calico", "persian"],["none"]],
                   "dog"      : [["dog", "dalmatian", "poodle"], ["cat", "calico", "persian","animal","none"]],
                   "cat"      : [["cat", "calico", "persian"], ["dog", "dalmatian", "poodle","animal","none"]],
                   "dalmatian": [["dalmatian"], ["cat", "calico", "persian","dog", "poodle","animal","none"]],
                   "poodle"   : [["poodle"],    ["cat", "calico", "persian","dog", "dalmatian","animal","none"]],
                   "calico"   : [["calico"],    ["cat", "persian","dog", "dalmatian", "poodle", "animal","none"]],
                   "persian"  : [["persian"],   ["cat", "calico","dog", "dalmatian", "poodle", "animal","none"]]};
var questionSpace = ["dalmatian?", "poodle?", "dog?", "calico?", "persian?", "cat?", "animal?"]
var worldStates = ["dalmatian", "poodle", "calico", "persian"]

var literalPartition = function(q_utterance, world) {
  var utt = q_utterance.slice(0,-1)
  return answerSpace[utt]   
}

// Returns uniform erp over answers consistent with the world and the literal partition
var meaning = function(partition, world) {
  var answer_set = _.contains(partition[0], world) ? partition[0] : partition[1]
  return Enumerate(function(){var i = randomInteger(answer_set.length);
                              return answer_set[i]})
}

// returns distribution over all possible answers that could be given to a question
var literalAnswerer = function(q_utterance) {
  Enumerate(function(){
    var w = worldPrior()
    var p = literalPartition(q_utterance, w) // clumps utterances into cells demanded by QUD
    print(p)
    var a = sample(meaning(p, w)) // ERP over answers in cell of partition where w is found
    return a
  })}

//print(literalAnswerer("dalmatian?"))

// questioner reasons about which q_utt to use given this decision prob, 
// based on what the literalAnswerer would think
var questioner = function(decision_problem) {
  var q_utt = questionPrior()
  var w = worldPrior()
  var a = literalAnswerer(q_utt, w)
  return q_utt
}

// pragmatic answerer infers what decision problem the questioner must 
// be interested in on the basis of what questions they would ask given that dp
var pragmaticAnswerer = function(q_utterance){ 
  var dp = decisionProblemPrior()
  factor(q_utterance == sample(questioner(dp)) ? 0 : -Infinity)
  var p = partition(dp, q_utterance)
  return meaning(p, world)
}
~~~~