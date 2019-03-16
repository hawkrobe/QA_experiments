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

// Tests for scenario where you have 2 in same row/col and are trying to get 3rd
function sameRowsCols(state) {
  if (state['safe'].length != 2 || state['unsafe'].length != 0) {
    return false;
  } else {
    var safe1 = state['safe'][0];
    var safe2 = state['safe'][1];
    return safe1[0] == safe2[0] || safe1[1] == safe2[1];
  }
}

function mapQuestionDiff(goal, question, state) {
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
function mapQuestionSame(goal, question, state) {
  var safe = state['safe'];
  var getRelevantPart = goal == 'rows' ? v => v[0] : v => v[1];
  var getOtherPart = goal == 'rows' ? v => v[1] : v => v[0];
  var relevantPartOfQuestion = getRelevantPart(question);
  var otherPartOfQuestion = getOtherPart(question);  
  var relevantPartOfState = _.uniq(_.map(safe, getRelevantPart));
  var otherPartOfState = _.uniq(_.map(safe, getOtherPart));
  var info = relevantPartOfState.length == 1 ? {withinGoal: true} : {withinGoal: false}
  console.log(relevantPartOfState)
  console.log(relevantPartOfQuestion);
  if(info.withinGoal && relevantPartOfState[0] == relevantPartOfQuestion) {
    return _.extend({question: 'easy'}, info);
  } else if(_.includes(relevantPartOfState, relevantPartOfQuestion)) {
    return _.extend({question: 'hard'}, info);
  } else {
    return _.extend({question: 'other'}, info);
  }
}

var questionerData = readCSV('../../data/experiment3/questionFromMongo_clean.csv');

var fixedQuestionerData = _.flatten(
  _.values(
    _.mapValues(
      _.groupBy(questionerData, response => {
	return response['gameid'] + '_' + response['trialNum'];
      }), trialData => {
	var Q1 = trialData[0];
	var Q2 = _.find(trialData, {questionNumber: '2'});
	var QN = trialData.slice(-1)[0];
	var rowGoal = Q1['goal'] == 'rows';

	var initState = JSON.parse(Q1['gridState']);
	var secondState = Q2 ? JSON.parse(Q2['gridState']) : 'none';
	var finalState = JSON.parse(QN['gridState']);

	if(initState['safe'].length != 1) {
	  return _.map(trialData, v => _.extend({}, v, {
	    initAskedAbout: 'none', secondAskedAbout: 'none'
	  }));
	} else {
	  var getRelevantPart = rowGoal ? v => v[0] : v => v[1];
	  var getOtherPart = rowGoal ? v => v[1] : v => v[0];
	  
	  var part = getRelevantPart(initState['safe'][0]);
	  var anyUnsafe = _.some(finalState['unsafe'],
				 s => getRelevantPart(s) == part);
	  var initAskedAbout = 'none';
	  if(getRelevantPart(initState['safe'][0]) == getRelevantPart(Q1['question'])){
	    initAskedAbout = _.includes(finalState['unsafe'], Q1['question']) ? 'sameButUnsafe' : 'sameAndSafe';
	  } else {
	    initAskedAbout = 'other';
	  }
	  var secondAskedAbout = 'none' ;
	  if(Q2) {
	    if(_.includes(_.map(secondState['unsafe'], getRelevantPart),
			  getRelevantPart(Q2['question'])))
	      secondAskedAbout = 'sameAsUnsafe';
	    else if(_.includes(_.map(secondState['safe'], getRelevantPart),
			       getRelevantPart(Q2['question'])))
	      secondAskedAbout = 'sameAsSafe';
	    else
	      secondAskedAbout = 'newAndUnknown';
	  }
	  return _.map(trialData, v => _.extend({}, v, {
	    trialType : anyUnsafe ? 'blocked' : 'pragmatic',
	    initAskedAbout,
	    secondAskedAbout
	  }));
	}
      })
  )
);

writeCSV(fixedQuestionerData, './questionFromMongo_fixed.csv');

var annotatedQuestionerData = _.map(fixedQuestionerData, function(response) {
  var state = JSON.parse(response['gridState']);
  var rowGoal = response['goal'] == 'rows';
  var origQ = response['question'];
  // Remap all simple cases (e.g. single cell revealed)
  // to canonical case w/ upper-left hand corner
  if(state['safe'].length == 1 && state['unsafe'].length == 0) {
    var onGoal = (rowGoal ?
		  origQ[0] == state['safe'][0][0] :
		  origQ[1] == state['safe'][0][1]);
    return _.extend({}, response, {
      gridState: JSON.stringify({safe: ['A1'], unsafe: []}),
      question: onGoal ? 'A2': 'C3',
      goal: 'rows',
      qualitativeQuestion: onGoal ? 'onGoal' : 'offGoal',
      qualitativeTrialType : 'singleCell'
    });
  } else if(sameRowsCols(state)) {
    var info = mapQuestionSame(response['goal'], response['question'], state);    
    var out = _.extend({}, response, {
      gridState: (info.withinGoal ?
		  JSON.stringify({safe: ['A1', 'A2'], unsafe: []}) :
		  JSON.stringify({safe: ['A1', 'B1'], unsafe: []})),
      question: (info.question == 'easy' || info.question == 'hard' ? 'A3' : 'C3'),
      goal: 'rows',
      qualitativeQuestion: info.question,
      qualitativeTrialType : '2C_straight'
    });
    return out
  } else if(diffRowsCols(state)) {
    var question = mapQuestionDiff(response['goal'], response['question'], state);
    return _.extend({}, response, {
      gridState: JSON.stringify({safe: ['A2', 'B1'], unsafe: []}),
      question: (question == 'confusing' ? 'A1' :
		 question == 'pragmatic' ? 'A3' :
		 'C1'),
      goal: 'rows',
      qualitativeQuestion: question,
      qualitativeTrialType : '2C_ambiguous'
    });
  } else {
    return _.extend({}, response, {qualitativeQuestion: 'none', qualitativeTrialType: 'other'});
  }
});

writeCSV(annotatedQuestionerData, './questionFromMongo_qualitative.csv');
