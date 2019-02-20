///fold:
var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};

var mean = function(thunk){
  return expectation(Enumerate(thunk), function(v){return v;});
};

var negate = function(predicate){
  return function(x){
    return !predicate(x);
  };
};

var identity = function(x){
 return x;
};

var condition = function(x){
 factor(x ? 0 : -Infinity);
};
///

var getUtility = function(dp, action, world){
  return dp.utility[world][action];
};

var worldPrior = function(dp) {
  return uniformDraw(dp.worlds);
};

var questionPrior = function() {
  var questionSpace = ["tired?", "reg?", "motivated?", "null"];
  return uniformDraw(questionSpace);
};

var answerPrior = function(){
  var answerSpace = ["yes", "no"];
  return uniformDraw(answerSpace);
};

var meaning = function(utterance){
  return (utterance == "tired?"     ? function(world){return world==0;} :
          utterance == "reg?"       ? function(world){return world==1;} :
          utterance == "motivated?" ? function(world){return world==2;} :
          utterance == "yes" ? identity :
          utterance == "no" ? negate :
          function(w){return true;});
};

var literalListener = function(question, answer, dp){
  Enumerate(function(){
    var world = worldPrior(dp);
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
};

var answerer = function(question, trueWorld, dp) {
  Enumerate(function(){
    var answer = (question == "null") ? "yes" : answerPrior();
    // condition on listener inferring the true world given this answer
    factor(literalListener(question, answer, dp).score([], trueWorld));
    return answer;
  });
};

var valDP_hardMax = function(question, dp) {
  return mean(function(){
    var trueWorld = worldPrior(dp);
    var actionAndEU = maxWith(
      function(action){
        var expectedUtility = mean(function(){
          // If I ask this question, what answer do I expect to get?
          var answer = sample(answerer(question, trueWorld, dp));
          // Given this answer, how do I update my distribution on worlds?
          var world = sample(literalListener(question, answer, dp));
          return getUtility(dp, action, world);
        });
        return expectedUtility;
      },
      dp.actions);
    return actionAndEU[1];
  });
};

var questioner = function(dp) {
  Enumerate(function(){
    var question = questionPrior();
    var value = valDP_hardMax(question, dp) - valDP_hardMax("null", dp);
    print([question, value]);
    factor(value);    
    return question;
  });
};

var dp = {
  actions: [0, 1, 2],
  worlds:  [0, 1, 2],
  utility: [[0,-4,-10], // utility[world][action]
            [0,5,2],
            [0,6,10]]
};

print(questioner(dp));