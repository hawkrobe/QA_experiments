var fs = require('fs');
var babyparse = require('babyparse');
var _ = require('lodash');

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8'), {
    header: true,
    keepEmptyRows:false,
    skipEmptyLines: true
  }).data;
};

function writeCSV(csv, filename){
  fs.writeFileSync(filename, babyparse.unparse(csv) + '\n');
}

// Tests for scenario where some questions reveal goal and others are ambiguous
function diffRowsCols(state) {
  if (state['safe'].length != 2 || state['unsafe'].length != 0) {
    return false;
  } else {
    var safe1 = state['safe'][0];
    var safe2 = state['safe'][1];
    return safe1[0] != safe2[0] && safe1[1] != safe2[1];
  }
}

function mapQuestion(goal, question, state) {
  var safe = state['safe'];
  var getRelevantPart = goal == 'rows' ? v => v[0] : v => v[1];
  var getOtherPart = goal == 'rows' ? v => v[1] : v => v[0];
  var relevantPartOfQuestion = getRelevantPart(question);
  var otherPartOfQuestion = getOtherPart(question);  
  var relevantPartOfState = _.map(safe, getRelevantPart);
  var otherPartOfState = _.map(safe, getOtherPart);
  if(_.includes(relevantPartOfState, relevantPartOfQuestion) &&
     _.includes(otherPartOfState, otherPartOfQuestion)) {
    return 'confusing';
  } else if(_.includes(relevantPartOfState, relevantPartOfQuestion) &&
	    !_.includes(otherPartOfState, otherPartOfQuestion)) {
    return 'pragmatic';
  } else {
    return 'other';
  }
}
var answererData = readCSV('../../data/experiment3/answerFromMongo_clean.csv');
var questionerData = readCSV('../../data/experiment3/questionFromMongo_clean.csv');

console.log('pull out simple pragmatic cases');
var annotatedQuestionerData = _.map(questionerData, function(response) {
  var state = JSON.parse(response['gridState']);
  // Handle 'pragmatic' cases
  if(state['safe'].length == 1 && state['unsafe'].length == 0) {
    var orig = response['question'];
    var onGoal = (response['goal'] == 'rows' ?
		  orig[0] == state['safe'][0][0] :
		  orig[1] == state['safe'][0][1]);
    return _.extend({}, response, {
      qualitativeQuestion: onGoal ? 'onGoal' : 'offGoal',
      qualitativeTrialType : 'singleCell'
    });
  } else if(diffRowsCols(state)) {
    var question = mapQuestion(response['goal'], response['question'], state);
    console.log(question);
    return _.extend({}, response, {
      qualitativeQuestion: question,
      qualitativeTrialType : 'ambiguous'
    });
  } else {
    return _.extend({}, response, {qualitativeQuestion: 'none', qualitativeTrialType: 'other'});
  }
});

writeCSV(annotatedQuestionerData, './questionFromMongo_qualitative.csv');
