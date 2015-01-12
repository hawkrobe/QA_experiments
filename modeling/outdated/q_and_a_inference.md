In this document, we formulate Van Rooy's (2003) decision theoretic model of question and answer behavior in WebPPL and proceed to extend it in several ways. The basic setup requires a questioner facing a decision problem and an answerer who has information that might help the questioner resolve their problem. A decision problem is a function mapping actions and world states to utilities. 

For a basic example, suppose that Mary is the manager at a widget factory, and is allowed to press one of three buttons. One shuts the conveyer belt down, one speeds it up, and one sets it at an intermediate speed. In addition, the workers at the factory can be in one of three states: tired, regular, or motivated. If Mary stops the conveyer belt for regular or motivated workers, the factory suffers loses in productivity. If she stops the belt for tired workers, though, there's no loss since the workers weren't going to do a good job anyway. Similar stories can be given for the other two worker mental states. Numerical payoffs can be assigned for each action-world pair. This yields a fully specified decision problem.

Given no information about which worlds are most likely, we can calculate the expected utility of the decision problem for each action:
$$E_w[dp(a,w)] = \sum_w .33 * dp(a, w)$$
To get the value of the decision problem, von Rooy uses the expected utility for the action that maximizes this function -- a 'hard max' rule. Alternatively, we could use a 'soft max' rule, which simply weights the term for each possible action-world pair by its corresponding payoff and takes the expected value. We've implemented this decision problem below:

~~~~
// a decision problem is a function from actions and world states to real numbers
var dp_factory = function (a, w) {
  var utils = [[0,-4,-10], 
               [0,5,2], 
               [0,6,10]];
  return utils[w][a]
}

var actionPrior = function() {
  var actionSpace = [0,1,2]
  var i = randomInteger(actionSpace.length);
  return actionSpace[i]
}

var worldPrior = function() {
  var worldSpace  = [0,1,2]
  var i = randomInteger(worldSpace.length)
  return worldSpace[i]
}

var valDP_softMax = function(dp) {
  expectation(Enumerate(function(){
    var w = worldPrior()
    var a = actionPrior()
    factor(dp(a,w));
    return dp(a,w);
  }), function(v) {return v})
}

var valDP_hardMax = function(dp) {
  var action_set = [0,1,2]
  var res = maxWith(function(a){
    expectation(Enumerate(function(){
      var w = worldPrior()
      return dp(a, w);
    }), function(v) {return v})
  }, action_set);
  return res[1];
}

print(valDP_hardMax(dp_factory))
~~~~

Note that the expected utility calculated here assumes that Mary has no information about which world is the case and has to make her decision based on the (uniform) prior over worlds -- her best bet is to keep the belt going at regular speed, which has a utility of 2.3. If she was able to ask a worker on the floor how people were feeling, however, she could tailor her actions to fit this world and potentially raise her expected payoff. For example, even though stopping the conveyer has no value on average, it's actually the best action if she knows with certainty that the workers are tired. 

We first model a literal answerer who hears a polar question of the type "do the workers have mental state *x*?" and returns a distribution over worlds in which the answer is "true." This is in line with the literal listener in previous Rational Speech Act models. 

Note that this is at best a partial solution, since it does not allow the answerer to say "no" to the question. Saying "no" would leave some uncertainty for the questioner over which of the remaining mental states is the case, whereas here Mary calculates the utility of asking a particular question as the utility of knowing that the answer is "yes". We will fix this problem later.






~~~~
// interprets question literally -- returns "true" if the answer is "yes" in world w 
// and "false" otherwise
var meaning = function(utt, w) {
  return (utt == "tired?"     ? w==0 :
          utt == "reg?"       ? w==1 :
          utt == "motivated?" ? w==2 :
          true)
}

// returns a distribution over worlds in which the answer to the question is true
var literalListener = function(utt) {
  Enumerate(function() {
    var w = worldPrior()
    factor(meaning(utt, w) ? 0 : -Infinity)
    return w
  })
}

// uses prior for null utterance and 
var valDP_softMax = function(utt, dp) {
  expectation(Enumerate(function(){
    var w = (utt == "null" ? worldPrior() : sample(literalListener(utt)));
    var a = actionPrior()
    factor(dp(a,w));
    return dp(a,w);
  }), function(v) {return v})
}

var valDP_hardMax = function(utt, dp) {
  var res = maxWith(function(a){
    expectation(Enumerate(function(){
      var w = utt == "null" ? worldPrior() : sample(literalListener(utt));
      return dp(a, w);
    }), function(v) {return v})
  },
                    [0,1,2]);
  return res[1];
}

print(valDP_hardMax("null", dp_factory))
print(valDP_hardMax("tired?", dp_factory))
print(valDP_hardMax("motivated?", dp_factory))
~~~~

We see that if Mary knows for a fact that her workers are tired, she will get a payoff of 0 (since the best thing to do is stop the belt), whereas if she knows for a fact that her workers are motivated, she will get a payoff of 10. Now that we can calculate the value of a decision problem given certain knowledge about a particular state of the world (i.e. assuming the answer to the question is always "yes"), we can calculate the likelihood of the speaker asking different questions about the state of the world. The expected utility of a question is the difference between the value of the DP given the null utterance (i.e. acting without knowing anything) and the value of the DP given certain knowledge of some state.






~~~~
var questionPrior = function() {
  var questionSpace = ["tired?", "reg?", "motivated?", "null"]
  var i = randomInteger(questionSpace.length)
  return questionSpace[i]
}

var questioner = function(dp) {
  Enumerate(function(){
    var utt = questionPrior()
    var value = valDP_hardMax(utt, dp) - valDP_hardMax("null", dp)
    print([utt, value])
    factor(value)
    return utt
  })
}

print(questioner(dp_factory))
~~~~

We see that the largest increase in utility over the null utterance comes from asking whether the employees are motivated. This may be wishful thinking, however. This model simply demonstrates that if Mary got to *pick the state* of the workers, she would pick 'motivated.' 

This is counterintuitive as the best question overall, though -- suppose Mary asked her employees whether they were motivated and they responded "no". Then Mary faces a problem. She still doesn't know whether the workers are tired, which is the worst case scenario. If they are tired she should stop the belt to prevent large negative utilities (presumably from all the mistakes being made). If they are not tired, then stopping the belt would be a very bad idea.

We now extend the model to allow for "no" answers. This works by utilizing the standard Groenendijk partition semantics. Instead of returning a distribution over worlds in which the utterance is true, the literal answerer will return a distribution over worlds in the appropriate cell of the partition. If the answer to the question is true in the given world, the answerer will return that world, but if it is false, they will return a distribution over the remaining worlds that it could be. 

Formally, suppose we first fix a question utterance $u$. This question creates a partition $P_u$ on the space of possible worlds. For every world $w^*$ that could be the case (and the questioner does not know which is *actually* the case), one cell of this partition is selected by the answerer, denoted $P_u(w^*)$, containing one or more possible worlds. We can then compute the expected value of the decision problem given $w^*$ to be 
$$\max_{a\in\mathcal{A}}[\sum_{w\inP_u(w^*)}P(w|P_u(w^*)) \times U(a, w)]$$
using a hard max rule over the set of actions. Note that the inner sum ranges over the worlds in the selected cell of the partition. The questioner then marginalizes over the possible values of $w^*$ to get the expected value of the question given utterance $u$. By picking the $u$ that maximizes this expected utility, we get a decision rule for optimally selecting questions.

~~~~
// returns a distribution over worlds in the appropriate cell of the partition
var literalAnswerer = function(utt, w) {
  Enumerate(function(){
    var partition = span(function(b){return meaning(utt, b)}, [0,1,2])
    var answer_set = (_.contains(partition[0], w) ? partition[0] :
                      partition[1])
    var i = randomInteger(answer_set.length);
    return answer_set[i]
  })
}

var valDP_hardMax = function(utt, dp) {
  expectation(Enumerate(function(){
    var true_w = worldPrior()
    var res = maxWith(function(a){
      var exp = expectation(Enumerate(function(){
        var w = utt == "null" ? worldPrior() : sample(literalAnswerer(utt, true_w));
        return dp(a, w);
      }), function(v) {return v})
      return exp;
    }, [0,1,2])
    return res[1];
  }), function(v) {return v})
}


print(questioner(dp_factory))
~~~~

We now recover the expected 'best question'. Note that we have been using the hard max, as in Van Rooy (2003), since it shows the effect most starkly. The softMax shows less of a difference between questions.

~~~~

~~~~