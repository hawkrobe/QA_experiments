///fold:
var flatten = function(xs){
  if (xs.length == 0) {
    return [];
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
};

var getLeaves = function(key, obj){
  if (obj === null){
    return [key];
  } else {
    var pairs = _.pairs(obj);
    return flatten(
      map(
        function(pair){
          return leaves(pair[0], pair[1])}, pairs));
  }
};

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
  var questionSpace = ["null", "poodle?", "dalmatian?", "siamese?", "basil?", "dog?", "animal?"];
  return uniformDraw(questionSpace);
};

var polarAnswerPrior = function(){
  var answerSpace = ["yes.", "no."];
  return uniformDraw(answerSpace);
};

var fullAnswerPrior = function(){
  var answerSpace = ["yes.", "no.", "poodle.", "dalmatian.", "siamese.", "basil.",  "dog.", "animal."];
  return uniformDraw(answerSpace);
};

// Added questions that query subtrees
var meaning = function(utterance){
  return (      // QUESTIONS
    utterance == "poodle?"   ? function(world){return world==0;} :
    utterance == "dalmatian?"? function(world){return world==1;} :
    utterance == "siamese?"  ? function(world){return world==2;} :
    utterance == "basil?"    ? function(world){return world==3;} :
    utterance == "dog?"      ? function(world){return world< 2;} :
    utterance == "animal?"   ? function(world){return world< 3;} :

                // ANSWERS
    utterance == "dog."       ? function(pred){return function(x){return x < 2}} :        
    utterance == "animal."    ? function(pred){return function(x){return x < 3}} :
    utterance == "poodle."    ? function(pred){return function(x){return x == 0}} :
    utterance == "dalmatian." ? function(pred){return function(x){return x == 1}} :  
    utterance == "siamese."   ? function(pred){return function(x){return x == 2}} :        
    utterance == "basil."     ? function(pred){return function(x){return x == 3}} :
    
    utterance == "yes." ? identity :
    utterance == "no." ? negate :
    function(w){return true;}
  );
};

var literalListener = cache(function(question, answer, dp){
  Enumerate(function(){
    var world = worldPrior(dp);
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
});

var polarAnswerer = cache(function(question, trueWorld, dp) {
  Enumerate(function(){
    var answer = (question == "null") ? "yes." : polarAnswerPrior();
    // condition on listener inferring the true world given this answer
    factor(literalListener(question, answer, dp).score([], trueWorld));
    return answer;
  });
});

var fullAnswerer = cache(function(question, trueWorld, dp) {
  Enumerate(function(){
    var answer = (question == "null") ? "yes." : fullAnswerPrior();
    // condition on listener inferring the true world given this answer
    factor(literalListener(question, answer, dp).score([], trueWorld));
    return answer;
  });
});

var valDP_hardMax = function(question, dp, answererType) {
  return mean(function(){
    var trueWorld = worldPrior(dp);
    var actionAndEU = maxWith(
      function(action){
        var expectedUtility = mean(function(){
          // If I ask this question, what answer do I expect to get?
          var answerer = answererType == "polar" ? polarAnswerer : fullAnswerer
          var answer = sample(answerer(question, trueWorld, dp))
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

var questioner = function(dp, answererType) {
  Enumerate(function(){
    var question = questionPrior();
    var value = (valDP_hardMax(question, dp, answererType) 
               - valDP_hardMax("null", dp, answererType));
    print([question, value]);
    factor(value);    
    return question;
  });
};

var taxonomy = {
  thing: {
    animal: {
      dog: {
        poodle: null,
        dalmatian: null
      },
      cat: {
        siamese: null
      }
    },
    plant: {
      basil: null
    }
  }
};

// Questioner is REALLY concerned with whether you have a siamese cat.
// If you have one, they want to make sure they guess correctly -- 
// If you don't, they have a slight preference not to guess wrong
//    (and also not to accidentally guess siamese)
var dp_id = {
  actions: [0, 1, 2, 3], // "guess dog1, dog2, cat1, basil1"
  worlds:  [0, 1, 2, 3], //       "dog1, dog2, cat1, basil1"
  utility: [[ 1, 0,-1, 0], // utility[world][action]
            [ 0, 1,-1, 0],
            [-1,-1, 5,-1],
            [ 0, 0,-1, 1]]
};

// Questioner only cares whether you have a dog; it doesn't matter what kind.
// Again, slight bias not to guess wrong, 
//      (and not to guess a dog when you don't have one)
var dp_DOGS = {
  actions: [0, 1, 2, 3], // "guess dog1, dog2, cat1, basil1"
  worlds:  [0, 1, 2, 3], // "dog1, dog2, cat1, basil1"
  utility: [[ 5,  5, -1,-1], // utility[world][action]
            [ 5,  5, -1,-1],
            [-1, -1,  1, 0],
            [-1, -1,  0, 1]]
};


print(questioner(dp_id, "polar"));
print(questioner(dp_id, "full"));
print(questioner(dp_DOGS, "polar"));
print(questioner(dp_DOGS, "full"));
