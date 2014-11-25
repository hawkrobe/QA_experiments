Let's assume that there's a questioner facing a decision problem and an answerer with information that can resolve this decision problem. In a popular model of question/answer behavior, questions form a partition on the space of possible worlds, and answers select one or more cells from that partition. There is some shared prior over what world might actually be the case (e.g. it might be more likely that someone has a dalmatian than a Persian cat), captured by `worldPrior()`. 

We first model a literal answerer who does not take the questioner's decision problem into account, and instead chooses a response purely on the basis The answerer, then, uses the `meaning()` function to evaluate for a given world whether it is a valid answer to the question. 

We will work with a simplified domain in which the state of the world consists of two buttons that have different colors and different functions, but the questioner doesn't know which button is which. 



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

var worldPrior = function() {
  var i = randomInteger(worldStates.length) 
  return worldStates[i]
}

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

var literalAnswerer = function(q_utterance) {// van rooy — assuming answerer knows decision prob
  Enumerate(function(){
    var w = worldPrior()
    var p = literalPartition(q_utterance, w) // clumps utterances into cells demanded by QUD
    print(p)
    var a = sample(meaning(p, w)) // ERP over answers in cell of partition where w is found
    return a
  })}

print(literalAnswerer("dalmatian?"))
~~~~

~~~~
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