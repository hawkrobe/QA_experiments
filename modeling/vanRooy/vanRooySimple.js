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

var meaning = function(utterance){
  return (utterance == "tired?"     ? function(world){return world==0;} :
          utterance == "reg?"       ? function(world){return world==1;} :
          utterance == "motivated?" ? function(world){return world==2;} :
          function(w){return true;});
};

var literalAnswerer = function(utterance, trueWorld, dp) {
  Enumerate(function(){
    var wordMeaning = meaning(utterance);
    var condition = wordMeaning(trueWorld) ? wordMeaning : negate(wordMeaning);
    var validWorlds = filter(condition, dp.worlds);
    return uniformDraw(validWorlds);
  });
};

var valDP_hardMax = function(utterance, dp) {
  return mean(function(){
    var trueWorld = worldPrior(dp);
    var actionAndEU = maxWith(
      function(action){
        var expectedUtility = mean(function(){
          var world = sample(literalAnswerer(utterance, trueWorld, dp));
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
    var utterance = questionPrior();
    var value = valDP_hardMax(utterance, dp) - valDP_hardMax("null", dp);
    print([utterance, value]);
    factor(value);
    return utterance;
  });
};

var dp = {
  actions: [0, 1, 2],
  worlds: [0, 1, 2],
  utility: [[0,-4,-10], // utility[world][action]
            [0,5,2],
            [0,6,10]]
};

print(questioner(dp));
